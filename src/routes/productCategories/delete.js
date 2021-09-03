/**
 * API to delete a product category
 */
import validate from 'express-validation';
import _ from 'lodash';
import Joi from 'joi';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import { EVENT, RESOURCES } from '../../constants';
import util from '../../util';
import models from '../../models';

const permissions = tcMiddleware.permissions;

const schema = {
  params: {
    key: Joi.string().max(45).required(),
  },
};

let result;
module.exports = [
  validate(schema),
  permissions('productCategory.delete'),
  (req, res, next) =>
    models.sequelize.transaction(() =>
      models.ProductCategory.findByPk(req.params.key)
        .then((entity) => {
          if (!entity) {
            const apiErr = new Error(`Product category not found for key ${req.params.key}`);
            apiErr.status = 404;
            return Promise.reject(apiErr);
          }
          // Update the deletedBy, then delete
          return entity.update({ deletedBy: req.authUser.userId });
        })
        .then(entity => entity.destroy())
        .then((entity) => {
          result = entity.toJSON();
          return entity;
        })
        .then(entity => util.updateMetadataFromES(req.log,
          util.generateDeleteDocFunction(_.pick(entity.toJSON(), 'key'), 'productCategories', 'key'))
          .then(() => entity)))
      .then((entity) => {
        util.sendResourceToKafkaBus(req,
          EVENT.ROUTING_KEY.PROJECT_METADATA_DELETE,
          RESOURCES.PRODUCT_CATEGORY,
          _.pick(entity.toJSON(), 'key'));
        res.status(204).end();
      })
      .catch((err) => {
        if (result) {
          util.publishError(result, 'productCategory.delete', req.log);
        }
        next(err);
      }),
];
