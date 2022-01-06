/**
 * API to list all customerPayments.
 */
import config from 'config';
import _ from 'lodash';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import models from '../../models';
import util from '../../util';

const ES_CUSTOMER_PAYMENT_INDEX = config.get('elasticsearchConfig.customerPaymentIndexName');
const ES_CUSTOMER_PAYMENT_TYPE = config.get('elasticsearchConfig.customerPaymentDocType');

/**
 * Retrieve customerPayments from elastic search.
 *
 * @param {Object} criteria the elastic search criteria
 * @returns {Promise} the promise resolves to the results
 */
function retrieveCustomerPayments(criteria) {
  return new Promise((accept, reject) => {
    const es = util.getElasticSearchClient();
    es.search({
      index: ES_CUSTOMER_PAYMENT_INDEX,
      type: ES_CUSTOMER_PAYMENT_TYPE,
      size: criteria.size,
      from: criteria.from,
      sort: criteria.sort,
      body: {
        query: { bool: { must: criteria.esTerms } },
      },
    }).then((docs) => {
      const rows = _.map(docs.hits.hits, '_source');
      accept({ rows, count: docs.hits.total });
    }).catch(reject);
  });
}

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

    // Build the elastic search query
    const pageSize = Math.min(req.query.perPage || config.pageSize, config.pageSize);
    const page = req.query.page || 1;
    const esTerms = _.map(filters, (filter, key) => ({ term: { [key]: filter } }));
    const criteria = {
      esTerms,
      size: pageSize,
      from: (page - 1) * pageSize,
      sort: _.join(sort.split(' '), ':'),
    };

    // Retrieve customer payments from elastic search
    return retrieveCustomerPayments(criteria)
      .then((result) => {
        if (result.rows.length === 0) {
          req.log.debug('Fetch customerPayment from db');
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
            .then(dbResult => util.setPaginationHeaders(req, res, _.extend(dbResult, { page, pageSize })));
        }
        req.log.debug('Fetch customerPayment found from ES');
        return util.setPaginationHeaders(req, res, _.extend(result, { page, pageSize }));
      })
      .catch(err => next(err));
  },
];
