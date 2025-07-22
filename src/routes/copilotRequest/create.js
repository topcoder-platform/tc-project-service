import validate from 'express-validation';
import _ from 'lodash';
import Joi from 'joi';
import { Op } from 'sequelize';

import models from '../../models';
import util from '../../util';
import { COPILOT_REQUEST_STATUS, COPILOT_OPPORTUNITY_TYPE } from '../../constants';
import { PERMISSION } from '../../permissions/constants';
import approveRequest from './approveRequest.service';

const addCopilotRequestValidations = {
  body: Joi.object().keys({
    data: Joi.object()
      .keys({
        projectId: Joi.number().required(),
        opportunityTitle: Joi.string().required(),
        copilotUsername: Joi.string(),
        complexity: Joi.string().valid('low', 'medium', 'high').required(),
        requiresCommunication: Joi.string().valid('yes', 'no').required(),
        paymentType: Joi.string().valid('standard', 'other').required(),
        otherPaymentType: Joi.string(),
        projectType: Joi.string().valid(_.values(COPILOT_OPPORTUNITY_TYPE)).required(),
        overview: Joi.string().min(10).required(),
        skills: Joi.array().items(
          Joi.object({
            id: Joi.string().required(),
            name: Joi.string().required(),
          }),
        ).min(1).required(),
        startDate: Joi.date().iso().required(),
        numWeeks: Joi.number().integer().positive().required(),
        tzRestrictions: Joi.string().required(),
        numHoursPerWeek: Joi.number().integer().positive().required(),
      })
      .required(),
  }),
};

module.exports = [
  validate(addCopilotRequestValidations),
  (req, res, next) => {
    const data = req.body;
    if (!util.hasPermissionByReq(PERMISSION.MANAGE_COPILOT_REQUEST, req)) {
      const err = new Error('Unable to create copilot request');
      _.assign(err, {
        details: JSON.stringify({ message: 'You do not have permission to create copilot request' }),
        status: 403,
      });
      return Promise.reject(err);
    }
    // default values
    const projectId = _.parseInt(req.params.projectId);
    _.assign(data, {
      projectId,
      status: COPILOT_REQUEST_STATUS.NEW,
      createdBy: req.authUser.userId,
      updatedBy: req.authUser.userId,
    });

    return models.sequelize.transaction((transaction) => {
      req.log.debug('Create Copilot request transaction', data);
      return models.Project.findOne({
        where: { id: projectId, deletedAt: { $eq: null } },
      })
        .then((existingProject) => {
          if (!existingProject) {
            const err = new Error(`active project not found for project id ${projectId}`);
            err.status = 404;
            throw err;
          }
          return models.CopilotRequest.findOne({
            where: {
              createdBy: req.authUser.userId,
              projectId,
              status: {
                [Op.in]: [COPILOT_REQUEST_STATUS.NEW, COPILOT_REQUEST_STATUS.APPROVED, COPILOT_REQUEST_STATUS.SEEKING],
              },
            },
          }).then((copilotRequest) => {
            if (copilotRequest && copilotRequest.data.projectType === data.data.projectType) {
              const err = new Error('There\'s a request of same type already!');
              _.assign(err, {
                status: 400,
              });
              throw err;
            }

            return models.CopilotRequest
              .create(data, { transaction });
          }).then((copilotRequest) => {
            /**
             * Automatically approve the copilot request.
             */
            const approveData = _.assign({
              projectId,
              copilotRequestId: copilotRequest.id,
              createdBy: req.authUser.userId,
              updatedBy: req.authUser.userId,
              type: copilotRequest.data.projectType,
              opportunityTitle: copilotRequest.data.opportunityTitle,
            });
            return approveRequest(req, approveData, transaction).then(() => copilotRequest);
          }).then(copilotRequest => res.status(201).json(copilotRequest))
            .catch((err) => {
              try {
                transaction.rollback();
              } catch (e) {
                _.noop(e);
              }
              return Promise.reject(err);
            });
        });
    })
      .catch((err) => {
        if (err.message) {
          _.assign(err, { details: err.message });
        }
        util.handleError('Error creating copilot request', err, req, next);
      });
  },
];
