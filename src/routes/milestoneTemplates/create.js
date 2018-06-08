/**
 * API to add a milestone template
 */
import validate from 'express-validation';
import _ from 'lodash';
import Joi from 'joi';
import Sequelize from 'sequelize';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import util from '../../util';
import models from '../../models';

const permissions = tcMiddleware.permissions;

const schema = {
  params: {
    productTemplateId: Joi.number().integer().positive().required(),
  },
  body: {
    param: Joi.object().keys({
      id: Joi.any().strip(),
      name: Joi.string().max(255).required(),
      description: Joi.string().max(255),
      duration: Joi.number().integer().required(),
      type: Joi.string().max(45).required(),
      order: Joi.number().integer().required(),
      productTemplateId: Joi.any().strip(),
      createdAt: Joi.any().strip(),
      updatedAt: Joi.any().strip(),
      deletedAt: Joi.any().strip(),
      createdBy: Joi.any().strip(),
      updatedBy: Joi.any().strip(),
      deletedBy: Joi.any().strip(),
    }).required(),
  },
};

module.exports = [
  validate(schema),
  permissions('milestoneTemplate.create'),
  (req, res, next) => {
    const entity = _.assign(req.body.param, {
      createdBy: req.authUser.userId,
      updatedBy: req.authUser.userId,
      productTemplateId: req.params.productTemplateId,
    });
    let result;

    return models.sequelize.transaction(tx =>
      // Find the product template
      models.ProductTemplate.findById(req.params.productTemplateId, { transaction: tx })
        .then((productTemplate) => {
          // Not found
          if (!productTemplate) {
            const apiErr = new Error(
              `Product template not found for product template id ${req.params.productTemplateId}`);
            apiErr.status = 404;
            return Promise.reject(apiErr);
          }

          // Create the milestone template
          return models.ProductMilestoneTemplate.create(entity, { transaction: tx });
        })
        .then((createdEntity) => {
          // Omit deletedAt and deletedBy
          result = _.omit(createdEntity.toJSON(), 'deletedAt', 'deletedBy');

          // Increase the order of the other milestone templates in the same product template,
          // which have `order` >= this milestone template order
          return models.ProductMilestoneTemplate.update({ order: Sequelize.literal('"order" + 1') }, {
            where: {
              productTemplateId: req.params.productTemplateId,
              id: { $ne: result.id },
              order: { $gte: result.order },
            },
            transaction: tx,
          });
        })
        .then(() => {
          // Write to response
          res.status(201).json(util.wrapResponse(req.id, result, 1, 201));
        })
        .catch(next),
    );
  },
];
