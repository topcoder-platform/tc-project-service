import validate from 'express-validation';
import _ from 'lodash';
import Joi from 'joi';

import models from '../../models';
import util from '../../util';
import { PERMISSION } from '../../permissions/constants';

const addCopilotOportunityValidations = {
  body: Joi.object().keys({
    data: Joi.object().required(),
    skills: Joi.array().items(Joi.string().max(160).min(1)),
    type: Joi.string().max(160).min(1),
  }), 
};

module.exports = [
  validate(addCopilotOportunityValidations),
  (req, res, next) => {
    const data = req.body;
    if(!util.hasPermissionByReq(PERMISSION.MANAGE_COPILOT_REQUEST, req)) {
      const err = new Error('Unable to approve copilot opportunity');
      _.assign(err, {
        details: JSON.stringify({ message: 'You do not have permission to approve copilot opportunity' }),
        status: 403,
      });
      return Promise.reject(err);
    }
    // default values
    const projectId = _.parseInt(req.params.projectId);
    const copilotRequestId = _.parseInt(req.params.copilotRequestId);
    _.assign(data, {
      projectId,
      copilotRequestId,
      createdBy: req.authUser.userId,
      updatedBy: req.authUser.userId,
    });

    models.sequelize.transaction((transaction) => {
      req.log.debug('Approve copilot opportunity transaction', data);
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
              id: copilotRequestId,
            },
          }).then((existingCopilotRequest) => {
            if (!existingCopilotRequest) {
              const err = new Error(`no active copilot request found for copilot request id ${copilotRequestId} and copilot request id ${copilotRequestId}`);
              err.status = 404;
              throw err;
            }
            return models.CopilotOpportunity
              .findOne({
                where: {
                  projectId,
                  type: data.type,
                },
              })
              .then((existingCopilotOpportunityOfSameType) => {
                if (existingCopilotOpportunityOfSameType) {
                  const err = new Error('Unable to approve copilot opportunity');
                  _.assign(err, {
                    details: JSON.stringify({ message: 'Already there is an opportunity of same type' }),
                    status: 403,
                  });
                  throw err;
                }
                return models.CopilotOpportunity
                  .create(data, { transaction })
                  .then((_newCopilotOpportunity) => {
                      return res.status(201).json(_newCopilotOpportunity);
                  });
              });
          })
        })
    })
      .catch((err) => {
        if (err.message) {
          _.assign(err, { details: err.message });
        }
        util.handleError('Error approving copilot request', err, req, next);
      });
  },
];
