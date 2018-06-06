/**
 * API to update a milestone template
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
    milestoneTemplateId: Joi.number().integer().positive().required(),
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
  permissions('milestoneTemplate.edit'),
  (req, res, next) => {
    const entityToUpdate = _.assign(req.body.param, {
      updatedBy: req.authUser.userId,
    });

    let original;
    let updated;

    return models.sequelize.transaction(() =>
      // Get the milestone template
      models.ProductMilestoneTemplate.findOne({
        where: {
          id: req.params.milestoneTemplateId,
          productTemplateId: req.params.productTemplateId,
        },
        attributes: { exclude: ['deletedAt', 'deletedBy'] },
      })
        .then((milestoneTemplate) => {
          // Not found
          if (!milestoneTemplate) {
            const apiErr = new Error(`Milestone template not found for template id ${req.params.milestoneTemplateId}`);
            apiErr.status = 404;
            return Promise.reject(apiErr);
          }

          original = _.omit(milestoneTemplate.toJSON(), ['deletedAt', 'deletedBy']);

          // Update
          return milestoneTemplate.update(entityToUpdate);
        })
        .then((milestoneTemplate) => {
          updated = _.omit(milestoneTemplate.toJSON(), ['deletedAt', 'deletedBy']);

          // Update order of the other milestones only if the order was changed
          if (original.order === updated.order) {
            return Promise.resolve();
          }

          return models.ProductMilestoneTemplate.count({
            where: {
              productTemplateId: updated.productTemplateId,
              id: { $ne: updated.id },
              order: updated.order,
            },
          })
            .then((count) => {
              if (count === 0) {
                return Promise.resolve();
              }

              // Increase the order from M to K: if there is an item with order K,
              // orders from M+1 to K should be made M to K-1
              if (original.order < updated.order) {
                return models.ProductMilestoneTemplate.update({ order: Sequelize.literal('"order" - 1') }, {
                  where: {
                    productTemplateId: updated.productTemplateId,
                    id: { $ne: updated.id },
                    order: { $between: [original.order + 1, updated.order] },
                  },
                });
              }

              // Decrease the order from M to K: if there is an item with order K,
              // orders from K to M-1 should be made K+1 to M
              return models.ProductMilestoneTemplate.update({ order: Sequelize.literal('"order" + 1') }, {
                where: {
                  productTemplateId: updated.productTemplateId,
                  id: { $ne: updated.id },
                  order: { $between: [updated.order, original.order - 1] },
                },
              });
            });
        })
        .then(() => {
          res.json(util.wrapResponse(req.id, updated));
          return Promise.resolve();
        })
        .catch(next),
    );
  },
];
