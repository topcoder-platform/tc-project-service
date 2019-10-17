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
    const filters = util.parseQueryFilter(req.query.filter);
    if (!util.isValidFilter(filters, ['productKey'])) {
      return util.handleError('Invalid filters', null, req, next);
    }
    const where = { deletedAt: { $eq: null }, disabled: false };
    if (filters.productKey) {
      where.productKey = { $eq: filters.productKey };
    }
    return models.ProductTemplate.findAll({
      where,
      attributes: { exclude: ['deletedAt', 'deletedBy'] },
      raw: true,
    })
    .then((productTemplates) => {
      res.json(productTemplates);
    })
    .catch(next);
  },
];
