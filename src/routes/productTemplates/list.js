/**
 * API to list all product templates
 */
import { middleware as tcMiddleware } from 'tc-core-library-js';
import util from '../../util';
import models from '../../models';

const permissions = tcMiddleware.permissions;

module.exports = [
  permissions('productTemplate.view'),
  (req, res, next) => {
    util.fetchFromES('productTemplates')
      .then((data) => {
        const filters = req.query;
        if (!util.isValidFilter(filters, ['productKey'])) {
          util.handleError('Invalid filters', null, req, next);
        }
        const where = { deletedAt: { $eq: null }, disabled: false };
        if (filters.productKey) {
          where.productKey = { $eq: filters.productKey };
        }
        if (data.productTemplates.length === 0) {
          req.log.debug('No productTemplate found in ES');
          models.ProductTemplate.findAll({
            where,
            attributes: { exclude: ['deletedAt', 'deletedBy'] },
            raw: true,
          })
            .then((productTemplates) => {
              res.json(productTemplates);
            })
            .catch(next);
        } else {
          req.log.debug('productTemplates found in ES');
          res.json(data.productTemplates);
        }
      });
  },
];
