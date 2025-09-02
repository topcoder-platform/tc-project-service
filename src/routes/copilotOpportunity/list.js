import _ from 'lodash';

import models from '../../models';
import util from '../../util';
import DEFAULT_PAGE_SIZE, { USER_ROLE } from '../../constants';

module.exports = [
  (req, res, next) => {
    let sort = req.query.sort ? decodeURIComponent(req.query.sort) : 'createdAt desc';
    if (sort.indexOf(' ') === -1) {
      sort += ' asc';
    }
    const sortableProps = ['createdAt asc', 'createdAt desc'];
    if (_.indexOf(sortableProps, sort) < 0) {
      return util.handleError('Invalid sort criteria', null, req, next);
    }
    const sortParams = sort.split(' ');
    const isAdminOrManager = util.hasRoles(req, [USER_ROLE.CONNECT_ADMIN, USER_ROLE.TOPCODER_ADMIN, USER_ROLE.PROJECT_MANAGER]);

    // Extract pagination parameters
    const page = parseInt(req.query.page, 10) || 1;
    const pageSize = parseInt(req.query.pageSize, 10) || DEFAULT_PAGE_SIZE;
    const offset = (page - 1) * pageSize;
    const limit = pageSize;
    const noGroupingByStatus = req.query.noGrouping === 'true';

    const baseOrder = [];

    // If grouping is enabled (default), add custom ordering based on status
    if (!noGroupingByStatus) {
      baseOrder.push([
        models.Sequelize.literal(`
          CASE
            WHEN "CopilotOpportunity"."status" = 'active' THEN 0
            WHEN "CopilotOpportunity"."status" = 'cancelled' THEN 1
            WHEN "CopilotOpportunity"."status" = 'completed' THEN 2
            ELSE 3
          END
        `),
        'ASC',
      ]);
    }
    baseOrder.push([sortParams[0], sortParams[1]]);

    return models.CopilotOpportunity.findAll({
      include: isAdminOrManager ? [
        {
          model: models.CopilotRequest,
          as: 'copilotRequest',
        },
        {
          model: models.Project,
          as: 'project',
          attributes: ['name'],
        },
      ] : [
        {
          model: models.CopilotRequest,
          as: 'copilotRequest',
        },
      ],
      order: baseOrder,
      limit,
      offset,
    })
      .then((copilotOpportunities) => {
        const formattedOpportunities = copilotOpportunities.map((opportunity) => {
          const plainOpportunity = opportunity.get({ plain: true });
          const formatted = Object.assign({}, plainOpportunity,
            plainOpportunity.copilotRequest ? plainOpportunity.copilotRequest.data : {},
            { copilotRequest: undefined },
          );

          // For users who are not admin or manager, we dont want to expose
          // the project id
          if (!isAdminOrManager) {
            delete formatted.projectId;
          }
          return ;
        });
        return util.setPaginationHeaders(req, res, {
          count: copilotOpportunities.count,
          rows: formattedOpportunities,
          page,
          pageSize,
        });
      })
      .catch((err) => {
        util.handleError('Error fetching copilot opportunities', err, req, next);
      });
  },
];
