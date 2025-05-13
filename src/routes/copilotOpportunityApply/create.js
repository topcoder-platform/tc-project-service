import _ from 'lodash';
import validate from 'express-validation';
import Joi from 'joi';

import models from '../../models';
import util from '../../util';
import { PERMISSION } from '../../permissions/constants';
import { COPILOT_OPPORTUNITY_STATUS } from '../../constants';

const applyCopilotRequestValidations = {
  body: Joi.object().keys({
    notes: Joi.string(),
  }),
};

module.exports = [
  validate(applyCopilotRequestValidations),
  async (req, res, next) => {
    const { notes } = req.body;
    const copilotOpportunityId = _.parseInt(req.params.id);
    if (!util.hasPermissionByReq(PERMISSION.APPLY_COPILOT_OPPORTUNITY, req)) {
      const err = new Error('Unable to apply for copilot opportunity');
      _.assign(err, {
        details: JSON.stringify({ message: 'You do not have permission to apply for copilot opportunity' }),
        status: 403,
      });
      return next(err);
    }

    const data = {
      userId: req.authUser.userId,
      createdBy: req.authUser.userId,
      updatedBy: req.authUser.userId,
      opportunityId: copilotOpportunityId,
      notes: notes ? req.sanitize(notes) : null,
    };

    return models.CopilotOpportunity.findOne({
      where: {
        id: copilotOpportunityId,
      },
    }).then(async (opportunity) => {
      if (!opportunity) {
        const err = new Error('No opportunity found');
        err.status = 404;
        return next(err);
      }

      if (opportunity.status !== COPILOT_OPPORTUNITY_STATUS.ACTIVE) {
        const err = new Error('Opportunity is not active');
        err.status = 400;
        return next(err);
      }

      const existingApplication = await models.CopilotApplication.findOne({
        where: {
          opportunityId: opportunity.id,
          userId: req.authUser.userId,
        },
      });

      if (existingApplication) {
        res.status(200).json(existingApplication);
        return Promise.resolve();
      }

      return models.CopilotApplication.create(data)
        .then((result) => {
          res.status(201).json(result);
          return Promise.resolve();
        })
        .catch((err) => {
          util.handleError('Error creating copilot application', err, req, next);
          return next(err);
        });
    }).catch((e) => {
      util.handleError('Error applying for copilot opportunity', e, req, next);
    });
  },
];
