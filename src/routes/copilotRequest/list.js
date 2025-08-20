import _ from 'lodash';
import { Op, Sequelize } from 'sequelize';

import models from '../../models';
import util from '../../util';
import { PERMISSION } from '../../permissions/constants';
import { DEFAULT_PAGE_SIZE } from '../../constants';

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

    const page = parseInt(req.query.page, 10) || 1;
    const pageSize = parseInt(req.query.pageSize, 10) || DEFAULT_PAGE_SIZE; 
    const offset = (page - 1) * pageSize;

    const projectId = _.parseInt(req.params.projectId);

    let sort = req.query.sort ? decodeURIComponent(req.query.sort) : 'createdAt desc';
    if (sort.indexOf(' ') === -1) {
      sort += ' asc';
    }
    const sortableProps = [
      'createdAt asc',
      'createdAt desc',
      'projectName asc',
      'projectName desc',
      'opportunityTitle asc',
      'opportunityTitle desc',
      'projectType asc',
      'projectType desc',
      'status asc',
      'status desc',
    ];
    if (_.indexOf(sortableProps, sort) < 0) {
      return util.handleError('Invalid sort criteria', null, req, next);
    }
    let sortParams = sort.split(' ');
    let order = [[sortParams[0], sortParams[1]]];
    const relationBasedSortParams = ['projectName'];
    const jsonBasedSortParams = ['opportunityTitle', 'projectType'];
    if (relationBasedSortParams.includes(sortParams[0])) {
      order = [
        [{model: models.Project, as: 'project'}, 'name', sortParams[1]],
        ['id', 'DESC']
      ]
    }

    if (jsonBasedSortParams.includes(sortParams[0])) {
      order = [
        [models.sequelize.literal(`("CopilotRequest"."data"->>'${sortParams[0]}')`), sortParams[1]],
        ['id', 'DESC'],
      ]
    }

    const whereCondition = projectId ? { projectId } : {};

    return models.CopilotRequest.findAndCountAll({
      where: whereCondition,
      include: [
        { model: models.CopilotOpportunity, as: 'copilotOpportunity', required: false },
        { model: models.Project, as: 'project', required: false },
      ],
      order,
      limit: pageSize,
      offset,
      distinct: true,
      subQuery: false,
    }).then(({rows: copilotRequests, count}) => util.setPaginationHeaders(req, res, {
      count: count,
      rows: copilotRequests,
      page,
      pageSize,
    }));
  },
];
