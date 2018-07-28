/**
 * API to list all product categories
 */
import { middleware as tcMiddleware } from 'tc-core-library-js';
import util from '../../util';
import models from '../../models';

const permissions = tcMiddleware.permissions;

module.exports = [
  permissions('productCategory.view'),
  (req, res, next) => models.ProductCategory.findAll({
    attributes: { exclude: ['deletedAt', 'deletedBy'] },
    raw: true,
  })
    .then((productCategories) => {
      res.json(util.wrapResponse(req.id, productCategories));
    })
    .catch(next),
];
