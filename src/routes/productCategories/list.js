/**
 * API to list all product categories
 */
import { middleware as tcMiddleware } from 'tc-core-library-js';
import models from '../../models';

const permissions = tcMiddleware.permissions;

module.exports = [
  permissions('productCategory.view'),
  (req, res, next) =>
    models.ProductCategory.findAll({
      where: {
        deletedAt: { $eq: null },
        disabled: false,
        hidden: false,
      },
      attributes: { exclude: ['deletedAt', 'deletedBy'] },
      raw: true,
    })
      .then(productCategories => res.json(productCategories))
      .catch(next),
];
