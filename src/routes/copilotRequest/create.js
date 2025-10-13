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
  async (req, res, next) => {
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

    try {
      const copilotRequest = await models.sequelize.transaction(async (transaction) => {
        req.log.debug('Create copilot request transaction', { data });

        const existingProject = await models.Project.findOne({
          where: { id: projectId, deletedAt: { $eq: null } },
          transaction,
        });

        if (!existingProject) {
          const err = new Error(`Active project not found for project id ${projectId}`);
          err.status = 404;
          throw err;
        }

        const existingRequest = await models.CopilotRequest.findOne({
          where: {
            createdBy: req.authUser.userId,
            projectId,
            status: {
              [Op.in]: [
                COPILOT_REQUEST_STATUS.NEW,
                COPILOT_REQUEST_STATUS.APPROVED,
                COPILOT_REQUEST_STATUS.SEEKING,
              ],
            },
          },
          transaction,
        });

        if (existingRequest && existingRequest.data.projectType === data.data.projectType) {
          const err = new Error('There\'s a request of same type already!');
          err.status = 400;
          throw err;
        }

        const newRequest = await models.CopilotRequest.create(data, { transaction });

        await approveRequest(req, {
          projectId,
          copilotRequestId: newRequest.id,
          createdBy: req.authUser.userId,
          updatedBy: req.authUser.userId,
          type: newRequest.data.projectType,
          opportunityTitle: newRequest.data.opportunityTitle,
          startDate: newRequest.data.startDate,
        }, transaction);

        return newRequest;
      });

      return res.status(201).json(copilotRequest);
    } catch (err) {
      req.log.error('Error creating copilot request', { error: err });
      if (err.message) _.assign(err, { details: err.message });
      util.handleError('Error creating copilot request', err, req, next);
      return undefined;
    }
  },
];

