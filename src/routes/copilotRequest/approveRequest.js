import validate from 'express-validation';
import _ from 'lodash';
import Joi from 'joi';

import util from '../../util';
import { PERMISSION } from '../../permissions/constants';
import { COPILOT_OPPORTUNITY_TYPE } from '../../constants';
import approveRequest from './approveRequest.service';

const addCopilotOportunityValidations = {
  body: Joi.object().keys({
    type: Joi.string().valid(_.values(COPILOT_OPPORTUNITY_TYPE)).required(),
  }),
};

module.exports = [
  validate(addCopilotOportunityValidations),
  (req, res, next) => {
    const data = req.body;
    if (!util.hasPermissionByReq(PERMISSION.MANAGE_COPILOT_REQUEST, req)) {
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

    return approveRequest(data)
      .then(_newCopilotOpportunity => res.status(201).json(_newCopilotOpportunity))
      .catch((err) => {
        if (err.message) {
          _.assign(err, { details: err.message });
        }
        util.handleError('Error approving copilot request', err, req, next);
      });
  },
];
