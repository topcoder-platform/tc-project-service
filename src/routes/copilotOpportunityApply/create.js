import validate from 'express-validation';
import _ from 'lodash';
import Joi from 'joi';

import models from '../../models';
import util from '../../util';
import { PERMISSION } from '../../permissions/constants';

const addCopilotApplicationValidations = {
  body: Joi.object().keys({
    data: Joi.object()
      .keys({
        opportunityId: Joi.number().required(),
      })
      .required(),
  }),
};

module.exports = [
  validate(addCopilotApplicationValidations),
  async (req, res, next) => {
    const data = {};
    const copilotOpportunityId = _.parseInt(req.params.id);
    if (!util.hasPermissionByReq(PERMISSION.APPLY_COPILOT_OPPORTUNITY, req)) {
      const err = new Error('Unable to apply for copilot opportunity');
      _.assign(err, {
        details: JSON.stringify({ message: 'You do not have permission to apply for copilot opportunity' }),
        status: 403,
      });
      return next(err);
    }
    // default values
    _.assign(data, {
      userId: req.authUser.userId,
      createdBy: req.authUser.userId,
      updatedBy: req.authUser.userId,
      opportunityId: copilotOpportunityId,
    });

    return models.CopilotOpportunity.findOne({
      where: {
        id: copilotOpportunityId,
      },
    }).then((opportunity) => {
      if (!opportunity) {
        const err = new Error('No opportunity found');
        err.status = 404;
        return next(err);
      }
  
      return models.CopilotApplication.create(data).catch((err) => {
        util.handleError('Error creating copilot application', err, req, next);
        return next(err);
      });
    }).catch((e) => {
      util.handleError('Error finding the copilot opportunity', err, req, next);
    });
  },
];
