/**
 * API to get a product category
 */
import validate from 'express-validation';
import Joi from 'joi';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import util from '../../util';
import models from '../../models';

const permissions = tcMiddleware.permissions;

const schema = {
  params: {
    key: Joi.string().max(45).required(),
  },
};

module.exports = [
  validate(schema),
  permissions('productCategory.view'),
  (req, res, next) => models.ProductCategory.findOne({
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

      res.json(util.wrapResponse(req.id, productCategory));
      return Promise.resolve();
    })
    .catch(next),
];
