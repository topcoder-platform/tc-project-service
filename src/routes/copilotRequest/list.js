import _ from 'lodash';

import models from '../../models';
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

    const projectId = _.parseInt(req.params.projectId);

    let sort = req.query.sort ? decodeURIComponent(req.query.sort) : 'createdAt desc';
    if (sort.indexOf(' ') === -1) {
      sort += ' asc';
    }
    const sortableProps = ['createdAt asc', 'createdAt desc'];
    if (_.indexOf(sortableProps, sort) < 0) {
      return util.handleError('Invalid sort criteria', null, req, next);
    }
    const sortParams = sort.split(' ');

    const whereCondition = projectId ? { projectId } : {};

    return models.CopilotRequest.findAll({
      where: whereCondition,
      include: [
        {
          model: models.CopilotOpportunity,
          as: 'copilotOpportunity',
        },
      ],
      order: [[sortParams[0], sortParams[1]]],
    })
      .then(copilotRequests => res.json(copilotRequests))
      .catch((err) => {
        util.handleError('Error fetching copilot requests', err, req, next);
      });
  },
];
