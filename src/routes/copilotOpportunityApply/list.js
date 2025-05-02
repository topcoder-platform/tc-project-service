import _ from 'lodash';
import { middleware as tcMiddleware } from 'tc-core-library-js';

import models from '../../models';
import { ADMIN_ROLES } from '../../constants';
import util from '../../util';

const permissions = tcMiddleware.permissions;

module.exports = [
  permissions('copilotApplications.view'),
  (req, res, next) => {

    console.log("start list operation");
    const isAdmin = util.hasRoles(req, ADMIN_ROLES);

    let sort = req.query.sort ? decodeURIComponent(req.query.sort) : 'createdAt desc';
    if (sort.indexOf(' ') === -1) {
      sort += ' asc';
    }
    const sortableProps = ['createdAt asc', 'createdAt desc'];
    if (_.indexOf(sortableProps, sort) < 0) {
      return util.handleError('Invalid sort criteria', null, req, next);
    }
    const sortParams = sort.split(' ');

    // Admin can see all requests and the PM can only see requests created by them
    const whereCondition = _.assign({},
      isAdmin ? {} : { createdBy: userId },
    );

    return models.CopilotApplication.findAll({
      where: whereCondition,
      include: [
        {
          model: models.CopilotOpportunity,
          as: 'copilotOpportunity',
        },
      ],
      order: [[sortParams[0], sortParams[1]]],
    })
      .then(copilotApplications => res.json(copilotApplications))
      .catch((err) => {
        util.handleError('Error fetching copilot applications', err, req, next);
      });
  },
];
