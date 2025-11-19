/**
 * API to list all customerPayments.
 */
import config from 'config';
import _ from 'lodash';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import models from '../../models';
import util from '../../util';

const permissions = tcMiddleware.permissions;

module.exports = [
  permissions('customerPayment.view'),
  (req, res, next) => {
    // handle filters
    const filters = _.omit(req.query, 'sort', 'perPage', 'page');

    let sort = req.query.sort ? decodeURIComponent(req.query.sort) : 'createdAt';
    if (sort && sort.indexOf(' ') === -1) {
      sort += ' asc';
    }

    const supportedFilters = ['reference', 'referenceId', 'createdBy', 'status'];
    const sortableProps = [
      'amount asc', 'amount desc',
      'currency asc', 'currency desc',
      'status asc', 'status desc',
      'createdAt asc', 'createdAt desc',
      'createdBy asc', 'createdBy desc',
      'updatedAt asc', 'updatedAt desc',
      'updatedBy asc', 'updatedBy desc',
    ];
    if (!util.isValidFilter(filters, supportedFilters) ||
      (sort && _.indexOf(sortableProps, sort) < 0)) {
      return util.handleError('Invalid filters or sort', null, req, next);
    }

    // Build the database query
    const pageSize = Math.min(req.query.perPage || config.pageSize, config.pageSize);
    const page = req.query.page || 1;
    const queryCondition = {
      attributes: {
        exclude: ['deletedAt', 'deletedBy'],
      },
      where: filters,
      limit: pageSize,
      offset: (page - 1) * pageSize,
      order: [sort.split(' ')],
      raw: true,
    };

    return models.CustomerPayment.findAndCountAll(queryCondition)
      .then(result => util.setPaginationHeaders(req, res, _.extend(result, { page, pageSize })))
      .catch(err => next(err));
  },
];
