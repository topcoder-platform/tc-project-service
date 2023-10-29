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
import validateMilestoneTemplate from '../../middlewares/validateMilestoneTemplate';
import { EVENT, RESOURCES, MILESTONE_TEMPLATE_REFERENCES } from '../../constants';

const permissions = tcMiddleware.permissions;

const schema = {
  params: {
    milestoneTemplateId: Joi.number().integer().positive().required(),
  },
  body: Joi.object().keys({
    id: Joi.any().strip(),
    name: Joi.string().max(255).optional(),
    description: Joi.string().max(255),
    duration: Joi.number().integer().optional(),
    type: Joi.string().max(45).optional(),
    order: Joi.number().integer().optional(),
    plannedText: Joi.string().max(512).optional(),
    activeText: Joi.string().max(512).optional(),
    completedText: Joi.string().max(512).optional(),
    blockedText: Joi.string().max(512).optional(),
    productTemplateId: Joi.any().strip(),
    hidden: Joi.boolean().optional(),
    reference: Joi.string().valid(_.values(MILESTONE_TEMPLATE_REFERENCES)).required(),
    referenceId: Joi.number().integer().positive().required(),
    metadata: Joi.object().optional(),
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
  validateMilestoneTemplate.validateIdParam,
  validateMilestoneTemplate.validateRequestBody,
  permissions('milestoneTemplate.edit'),
  (req, res, next) => {
    const entityToUpdate = _.assign(req.body, {
      updatedBy: req.authUser.userId,
    });

    const original = _.omit(req.milestoneTemplate.toJSON(), 'deletedAt', 'deletedBy');
    let updated;

    // Merge JSON field
    entityToUpdate.metadata = util.mergeJsonObjects(original.metadata, entityToUpdate.metadata || {});

    return models.sequelize.transaction(() =>
      // Update
      req.milestoneTemplate.update(entityToUpdate)
        .then((milestoneTemplate) => {
          updated = _.omit(milestoneTemplate.toJSON(), ['deletedAt', 'deletedBy']);

          // Update order of the other milestones only if the order was changed
          if (original.order === updated.order) {
            return Promise.resolve();
          }

          return models.MilestoneTemplate.count({
            where: {
              reference: updated.reference,
              referenceId: updated.referenceId,
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
                return models.MilestoneTemplate.update({ order: Sequelize.literal('"order" - 1') }, {
                  where: {
                    reference: updated.reference,
                    referenceId: updated.referenceId,
                    id: { $ne: updated.id },
                    order: { $between: [original.order + 1, updated.order] },
                  },
                });
              }

              // Decrease the order from M to K: if there is an item with order K,
              // orders from K to M-1 should be made K+1 to M
              return models.MilestoneTemplate.update({ order: Sequelize.literal('"order" + 1') }, {
                where: {
                  reference: updated.reference,
                  referenceId: updated.referenceId,
                  id: { $ne: updated.id },
                  order: { $between: [updated.order, original.order - 1] },
                },
              });
            });
        })
        .then((updatedCount) => {
          if (updatedCount) {
            return models.MilestoneTemplate.findAll({
              where: {
                reference: updated.reference,
                referenceId: updated.referenceId,
                id: { $ne: updated.id },
              },
              order: [['updatedAt', 'DESC']],
              limit: updatedCount[0],
            });
          }
          return Promise.resolve();
        }),
    )
      .then((otherUpdated) => {
        // emit the event
        util.sendResourceToKafkaBus(
          req,
          EVENT.ROUTING_KEY.MILESTONE_TEMPLATE_UPDATED,
          RESOURCES.MILESTONE_TEMPLATE,
          updated,
        );

        // emit the event for other milestone templates order updated
        _.map(otherUpdated, milestoneTemplate =>
          util.sendResourceToKafkaBus(
            req,
            EVENT.ROUTING_KEY.MILESTONE_TEMPLATE_UPDATED,
            RESOURCES.MILESTONE_TEMPLATE,
            milestoneTemplate.toJSON(),
          ),
        );

        res.json(updated);
        return Promise.resolve();
      })
      .catch(next);
  },
];
