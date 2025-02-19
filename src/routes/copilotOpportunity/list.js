import _ from 'lodash';

import models from '../../models';
import { ADMIN_ROLES } from '../../constants';
import util from '../../util';
import { PERMISSION } from '../../permissions/constants';

module.exports = [
  (req, res, next) => {
    if (!util.hasPermissionByReq(PERMISSION.MANAGE_COPILOT_REQUEST, req)) {
      const err = new Error('Unauthorized to view copilot opportunities');
      _.assign(err, {
        details: JSON.stringify({ message: 'You do not have permission to view copilot opportunities' }),
        status: 403,
      });
      return next(err);
    }

    const isAdmin = util.hasRoles(req, ADMIN_ROLES);
  
    const userId = req.authUser.userId;

    let sort = req.query.sort ? decodeURIComponent(req.query.sort) : 'createdAt desc';
    if (sort.indexOf(' ') === -1) {
      sort += ' asc';
    }
    const sortableProps = ['createdAt asc', 'createdAt desc'];
    if (_.indexOf(sortableProps, sort) < 0) {
      return util.handleError('Invalid sort criteria', null, req, next);
    }
    const sortParams = sort.split(' ');

    // Admin can see all opportunities and the PM can only see opportunities created by them
    const whereCondition = isAdmin ? {} : { createdBy: userId };

    models.CopilotOpportunity.findAll({
      where: whereCondition,
      order: [[sortParams[0], sortParams[1]]],
    })
      .then(copilotOpportunities => res.json(copilotOpportunities))
      .catch((err) => {
        util.handleError('Error fetching copilot opportunities', err, req, next);
      });
  },
];
