import validate from 'express-validation';
import _ from 'lodash';
import Joi from 'joi';

import models from '../../models';
import util from '../../util';
import { COPILOT_OPPORTUNITY_TYPE, COPILOT_REQUEST_STATUS } from '../../constants';
import { PERMISSION } from '../../permissions/constants';
import { Op } from 'sequelize';

const updateCopilotRequestValidations = {
  body: Joi.object().keys({
    data: Joi.object()
      .keys({
        projectId: Joi.number().required(),
        copilotUsername: Joi.string(),
        complexity: Joi.string().valid('low', 'medium', 'high'),
        requiresCommunication: Joi.string().valid('yes', 'no'),
        paymentType: Joi.string().valid('standard', 'other'),
        otherPaymentType: Joi.string(),
        opportunityTitle: Joi.string(),
        projectType: Joi.string().valid(_.values(COPILOT_OPPORTUNITY_TYPE)),
        overview: Joi.string().min(10),
        skills: Joi.array().items(
          Joi.object({
            id: Joi.string().required(),
            name: Joi.string().required(),
          }),
        ),
        startDate: Joi.date().iso(),
        numWeeks: Joi.number().integer().positive(),
        tzRestrictions: Joi.string(),
        numHoursPerWeek: Joi.number().integer().positive(),
      })
      .required(),
  }),
};

module.exports = [
  validate(updateCopilotRequestValidations),
  async (req, res, next) => {
    const copilotRequestId = _.parseInt(req.params.copilotRequestId);
    const patchData = req.body.data;

    if (!util.hasPermissionByReq(PERMISSION.MANAGE_COPILOT_REQUEST, req)) {
      const err = new Error('Unable to update copilot request');
      _.assign(err, {
        details: JSON.stringify({ message: 'You do not have permission to update copilot request' }),
        status: 403,
      });
      util.handleError('Permission error', err, req, next);
      return;
    }

    try {
      const copilotRequest = await models.CopilotRequest.findOne({
        where: { id: copilotRequestId },
      });

      if (!copilotRequest) {
        const err = new Error(`Copilot request not found for id ${copilotRequestId}`);
        err.status = 404;
        throw err;
      }

      // check if same type of copilot request already exists
      if (patchData.projectType !== undefined && patchData.projectType !== copilotRequest.data.projectType) {
        const sameTypeRequest = await models.CopilotRequest.findOne({
          where: {
            projectId: copilotRequest.projectId,
            status: {
              [Op.in]: [COPILOT_REQUEST_STATUS.NEW, COPILOT_REQUEST_STATUS.APPROVED, COPILOT_REQUEST_STATUS.SEEKING],
            },
            data: {
              projectType: patchData.projectType,
            },
            id: { [Op.not]: copilotRequestId },
          },
        });

        if (sameTypeRequest) {
          const err = new Error('There\'s a request of same type already!');
          _.assign(err, {
            status: 400,
          });
          throw err;
        }
      }

      // Only update fields provided in patchData
      await copilotRequest.update(_.assign({
        data: _.assign(copilotRequest.data, patchData),
        updatedBy: req.authUser.userId,
      }));

      res.status(200).json(copilotRequest);
    } catch (err) {
      if (err.message) {
        _.assign(err, { details: err.message });
      }
      util.handleError('Error updating copilot request', err, req, next);
    }
  },
];
