/**
 * API to list all milestone templates
 */
import _ from 'lodash';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import models from '../../models';
import validateMilestoneTemplate from '../../middlewares/validateMilestoneTemplate';

const permissions = tcMiddleware.permissions;

module.exports = [
  validateMilestoneTemplate.validateQueryFilter,
  permissions('milestoneTemplate.view'),
  (req, res, next) => {
    // Parse the sort query
    let sort = req.query.sort ? decodeURIComponent(req.query.sort) : 'order';
    if (sort && sort.indexOf(' ') === -1) {
      sort += ' asc';
    }
    const sortableProps = [
      'order asc', 'order desc',
    ];
    if (sort && _.indexOf(sortableProps, sort) < 0) {
      const apiErr = new Error('Invalid sort criteria');
      apiErr.status = 400;
      return next(apiErr);
    }
    const sortColumnAndOrder = sort.split(' ');

    // Get all milestone templates
    const where = { deletedAt: { $eq: null } };
    if (req.query.reference) {
      where.reference = req.query.reference;
    }

    if (req.query.referenceId) {
      where.referenceId = req.query.referenceId;
    }

    return models.MilestoneTemplate.findAll({
      where,
      order: [sortColumnAndOrder],
      attributes: { exclude: ['deletedAt', 'deletedBy'] },
      raw: true,
    })
      .then(result => res.json(result))
      .catch(next);
  },
];
