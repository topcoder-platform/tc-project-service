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
import validateMilestoneTemplate from '../../middlewares/validateMilestoneTemplate';
import { MILESTONE_TEMPLATE_REFERENCES } from '../../constants';

const permissions = tcMiddleware.permissions;

const schema = {
  body: {
    param: Joi.object().keys({
      id: Joi.any().strip(),
      name: Joi.string().max(255).required(),
      description: Joi.string().max(255),
      duration: Joi.number().integer().required(),
      type: Joi.string().max(45).required(),
      order: Joi.number().integer().required(),
      plannedText: Joi.string().max(512).required(),
      activeText: Joi.string().max(512).required(),
      completedText: Joi.string().max(512).required(),
      blockedText: Joi.string().max(512).required(),
      reference: Joi.string().valid(_.values(MILESTONE_TEMPLATE_REFERENCES)).required(),
      referenceId: Joi.number().integer().positive().required(),
      metadata: Joi.object().required(),
      hidden: Joi.boolean().optional(),
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
  validateMilestoneTemplate.validateRequestBody,
  permissions('milestoneTemplate.create'),
  (req, res, next) => {
    const entity = _.assign(req.body.param, {
      createdBy: req.authUser.userId,
      updatedBy: req.authUser.userId,
    });
    let result;

    return models.sequelize.transaction(tx =>
      // Create the milestone template
      models.MilestoneTemplate.create(entity, { transaction: tx })
        .then((createdEntity) => {
          // Omit deletedAt and deletedBy
          result = _.omit(createdEntity.toJSON(), 'deletedAt', 'deletedBy');

          // Increase the order of the other milestone templates in the same referenceId,
          // which have `order` >= this milestone template order
          return models.MilestoneTemplate.update({ order: Sequelize.literal('"order" + 1') }, {
            where: {
              reference: result.reference,
              referenceId: result.referenceId,
              id: { $ne: result.id },
              order: { $gte: result.order },
            },
            transaction: tx,
          });
        }),
    )
    .then(() => {
      // Write to response
      res.status(201).json(util.wrapResponse(req.id, result, 1, 201));
    })
    .catch(next);
  },
];
