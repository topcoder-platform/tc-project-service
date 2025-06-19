import _ from 'lodash';

import models from '../../models';
import util from '../../util';
import { COPILOT_APPLICATION_STATUS, COPILOT_OPPORTUNITY_STATUS, COPILOT_REQUEST_STATUS } from '../../constants';
import { PERMISSION } from '../../permissions/constants';

module.exports = [
  (req, res, next) => {
    if (!util.hasPermissionByReq(PERMISSION.CANCEL_COPILOT_OPPORTUNITY, req)) {
      const err = new Error('Unable to cancel copilot opportunity');
      _.assign(err, {
        details: JSON.stringify({ message: 'You do not have permission to cancel copilot opportunity' }),
        status: 403,
      });
      return Promise.reject(err);
    }
    // default values
    const opportunityId = _.parseInt(req.params.id);

    return models.sequelize.transaction(async (transaction) => {
      req.log.debug('Canceling Copilot opportunity transaction', opportunityId);
      const opportunity = await models.CopilotOpportunity.findOne({
        where: { id: opportunityId },
        transaction,
      });

      if (!opportunity) {
        const err = new Error(`No opportunity available for id ${opportunityId}`);
        err.status = 404;
        throw err;
      }

      const copilotRequest = await models.CopilotRequest.findOne({
        where: {
          id: opportunity.copilotRequestId,
        },
        transaction,
      });

      const applications = await models.CopilotApplications.findAll({
        where: {
          opportunityId: opportunity.id,
        },
        transaction,
      });

      applications.update({
        status: COPILOT_APPLICATION_STATUS.CANCELED,
      }, {
        transaction,
      });

      copilotRequest.update({
        status: COPILOT_REQUEST_STATUS.CANCELED,
      }, {
        transaction,
      });

      opportunity.update({
        status: COPILOT_OPPORTUNITY_STATUS.CANCELED,
      }, {
        transaction,
      });

      res.status(200).send({ id: opportunity.id });
    })
        
      .catch((err) => {
        if (err.message) {
          _.assign(err, { details: err.message });
        }
        util.handleError('Error canceling copilot opportunity', err, req, next);
      });
  },
];
