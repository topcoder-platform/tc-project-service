import _ from 'lodash';

import models from '../../models';
import { ADMIN_ROLES } from '../../constants';
import util from '../../util';
import { PERMISSION } from '../../permissions/constants';

module.exports = [
  (req, res, next) => {
    if (!util.hasPermissionByReq(PERMISSION.MANAGE_COPILOT_REQUEST, req)) {
      const err = new Error('Unauthorized to view copilot requests');
      _.assign(err, {
        details: JSON.stringify({ message: 'You do not have permission to view copilot requests' }),
        status: 403,
      });
      return next(err);
    }

    const isAdmin = util.hasRoles(req, ADMIN_ROLES);

    const userId = req.authUser.userId;
    const copilotRequestId = _.parseInt(req.params.copilotRequestId);

    // Admin can see all requests and the PM can only see requests created by them
    const whereCondition = _.assign({},
      isAdmin ? {} : { createdBy: userId },
      { id: copilotRequestId },
    );

    return models.CopilotRequest.findOne({
      where: whereCondition,
      include: [
        {
          model: models.CopilotOpportunity,
          as: 'copilotOpportunity',
        },
      ],
    })
      .then(copilotRequest => res.json(copilotRequest))
      .catch((err) => {
        util.handleError(`Error fetching copilot request ${copilotRequestId}`, err, req, next);
      });
  },
];
