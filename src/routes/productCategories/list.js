/**
 * API to list all product categories
 */
import { middleware as tcMiddleware } from 'tc-core-library-js';
import models from '../../models';
import util from '../../util';

const permissions = tcMiddleware.permissions;

module.exports = [
  permissions('productCategory.view'),
  (req, res, next) => {
    util.fetchFromES('productCategories')
      .then((data) => {
        if (data.productCategories.length === 0) {
          req.log.debug('No productCategory found in ES');
          models.ProductCategory.findAll({
            attributes: { exclude: ['deletedAt', 'deletedBy'] },
            raw: true,
          })
            .then((productCategories) => {
              res.json(productCategories);
            })
            .catch(next);
        } else {
          req.log.debug('productCategories found in ES');
          res.json(data.productCategories);
        }
      });
  },
];
