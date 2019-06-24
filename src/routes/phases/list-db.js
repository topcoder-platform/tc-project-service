import _ from 'lodash';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import util from '../../util';
import models from '../../models';

const PHASE_ATTRIBUTES = _.keys(models.ProjectPhase.rawAttributes);
const permissions = tcMiddleware.permissions;

module.exports = [
  permissions('project.view'),
  async (req, res, next) => {
    const projectId = _.parseInt(req.params.projectId);
    // check if the project is exist
    try {
      const count = await models.Project.count({ where: { id: projectId } });
      if (count === 0) {
        const apiErr = new Error(`active project not found for project id ${projectId}`);
        apiErr.status = 404;
        throw apiErr;
      }
    } catch (err) {
      return next(err);
    }

    // Parse the fields string to determine what fields are to be returned
    const rawFields = req.query.fields ? req.query.fields.split(',') : PHASE_ATTRIBUTES;
    let sort = req.query.sort ? req.query.sort : 'startDate';
    if (sort && sort.indexOf(' ') === -1) {
      sort += ' asc';
    }
    const sortableProps = [
      'startDate asc', 'startDate desc',
      'endDate asc', 'endDate desc',
      'status asc', 'status desc',
      'order asc', 'order desc',
    ];
    if (sort && _.indexOf(sortableProps, sort) < 0) {
      return util.handleError('Invalid sort criteria', null, req, next);
    }

    const sortParameters = sort.split(' ');

    const fields = _.union(
      _.intersection(rawFields, [...PHASE_ATTRIBUTES, 'products']),
      ['id'], // required fields
    );

    const parameters = {
      projectId,
      sortField: sortParameters[0],
      sortType: sortParameters[1],
      fields,
    };

    try {
      const { rows } = await models.ProjectPhase.search(parameters, req.log);
      return res.json(rows);
    } catch (err) {
      return next(err);
    }
  },
];
