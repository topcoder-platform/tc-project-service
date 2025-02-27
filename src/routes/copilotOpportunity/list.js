import _ from 'lodash';

import models from '../../models';
import util from '../../util';
import DEFAULT_PAGE_SIZE from '../../constants';

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

    // Extract pagination parameters
    const page = parseInt(req.query.page, 10) || 1;
    const pageSize = parseInt(req.query.pageSize, 10) || DEFAULT_PAGE_SIZE;
    const offset = (page - 1) * pageSize;
    const limit = pageSize;

    return models.CopilotOpportunity.findAll({
      include: [
        {
          model: models.CopilotRequest,
          as: 'copilotRequest',
        },
        {
          model: models.Project,
          as: 'project',
          attributes: ['name'],
        },
      ],
      order: [[sortParams[0], sortParams[1]]],
      limit,
      offset,
    })
      .then((copilotOpportunities) => {
        const formattedOpportunities = copilotOpportunities.map((opportunity) => {
          const plainOpportunity = opportunity.get({ plain: true });
          return Object.assign({}, plainOpportunity,
            plainOpportunity.copilotRequest ? plainOpportunity.copilotRequest.data : {},
            { copilotRequest: undefined },
          );
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
