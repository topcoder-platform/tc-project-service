/**
 * API to update a product category
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

  body: Joi.object().keys({
    key: Joi.any().strip(),
    displayName: Joi.string().max(255).optional(),
    icon: Joi.string().max(255).optional(),
    question: Joi.string().max(255).optional(),
    info: Joi.string().max(1024).optional(),
    aliases: Joi.array().optional(),
    disabled: Joi.boolean().optional(),
    hidden: Joi.boolean().optional(),
    createdAt: Joi.any().strip(),
    updatedAt: Joi.any().strip(),
    deletedAt: Joi.any().strip(),
    createdBy: Joi.any().strip(),
    updatedBy: Joi.any().strip(),
    deletedBy: Joi.any().strip(),
  }).required(),

};

module.exports = [
  validate(schema),
  permissions('productCategory.edit'),
  (req, res, next) => {
    const entityToUpdate = _.assign(req.body, {
      updatedBy: req.authUser.userId,
    });

    return models.ProductCategory.findOne({
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

        return productCategory.update(entityToUpdate);
      })
      .then((productCategory) => {
        util.sendResourceToKafkaBus(req,
          EVENT.ROUTING_KEY.PROJECT_METADATA_UPDATE,
          RESOURCES.PRODUCT_CATEGORY,
          productCategory.get({ json: true }),
        );
        res.json(productCategory);
        return Promise.resolve();
      })
      .catch(next);
  },
];
