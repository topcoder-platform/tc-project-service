
import _ from 'lodash';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import util from '../../util';
import models from '../../models';

const PHASE_ATTRIBUTES = _.without(_.keys(models.ProjectPhase.rawAttributes),
   'utm',
);

const permissions = tcMiddleware.permissions;

const retrieveProjectPhases = (req, criteria, sort, ffields) => {
  // order by
  const order = sort ? [sort.split(' ')] : [['createdAt', 'asc']];
  let fields = ffields ? ffields.split(',') : PHASE_ATTRIBUTES;
  // parse the fields string to determine what fields are to be returned
  fields = _.intersection(fields, PHASE_ATTRIBUTES);
  if (_.indexOf(fields, 'id') < 0) fields.push('id');

  return models.ProjectPhase.searchText({
    filters: criteria.filters,
    order,
    limit: criteria.limit,
    offset: criteria.offset,
    attributes: fields,
  }, req.log);
};

module.exports = [
  permissions('project.view'),
  (req, res, next) => {
    const projectId = _.parseInt(req.params.projectId);

    const filters = util.parseQueryFilter(req.query.filter);
    let sort = req.query.sort ? decodeURIComponent(req.query.sort) : 'createdAt';
    if (sort && sort.indexOf(' ') === -1) {
      sort += ' asc';
    }
    const sortableProps = [
      'createdAt', 'createdAt asc', 'createdAt desc',
      'updatedAt', 'updatedAt asc', 'updatedAt desc',
      'id', 'id asc', 'id desc',
      'status', 'status asc', 'status desc',
      'name', 'name asc', 'name desc',
      'budget', 'budget asc', 'budget desc',
      'progress', 'progress asc', 'progress desc',
    ];
    if (!util.isValidFilter(filters, ['id', 'status', 'type', 'name', 'status', 'budget', 'progress']) ||
      (sort && _.indexOf(sortableProps, sort) < 0)) {
      return util.handleError('Invalid filters or sort', null, req, next);
    }

    const criteria = {
      filters,
      limit: Math.min(req.query.limit || 20, 20),
      offset: req.query.offset || 0,
    };

    criteria.filters.projectId = projectId;

    return models.Project.findOne({
      where: { id: projectId, deletedAt: { $eq: null } },
    }).then((existingProject) => {
      if (!existingProject) {
        const err = new Error(`active project not found for project id ${projectId}`);
        err.status = 404;
        throw err;
      }
      return retrieveProjectPhases(req, criteria, sort, req.query.fields);
    }).then(result => res.json(util.wrapResponse(req.id, result.rows, result.count)))
      .catch(err => next(err));
  },
];
