/**
 * API to get a product category
 */
import validate from 'express-validation';
import Joi from 'joi';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import models from '../../models';
import util from '../../util';

const permissions = tcMiddleware.permissions;

const schema = {
  params: {
    key: Joi.string().max(45).required(),
  },
};

module.exports = [
  validate(schema),
  permissions('productCategory.view'),
  (req, res, next) => {
    util.fetchByIdFromES('productCategories', {
      query: {
        nested: {
          path: 'productCategories',
          query: {
            match: { 'productCategories.key': req.params.key },
          },
          inner_hits: {},
        },
      },
    }, 'metadata')
      .then((data) => {
        if (data.length === 0) {
          req.log.debug('No productCategory found in ES');
          models.ProductCategory.findOne({
            where: {
              key: req.params.key,
            },
            attributes: { exclude: ['deletedAt', 'deletedBy'] },
          })
            .then((productCategory) => {
            // Not found
              if (!productCategory) {
                const apiErr = new Error(`Product category not found for key ${req.params.key}`);
                apiErr.status = 404;
                return Promise.reject(apiErr);
              }

              res.json(productCategory);
              return Promise.resolve();
            })
            .catch(next);
        } else {
          req.log.debug('productCategories found in ES');
          res.json(data[0].inner_hits.productCategories.hits.hits[0]._source); // eslint-disable-line no-underscore-dangle
        }
      })
      .catch(next);
  },
];
