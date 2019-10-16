/* eslint-disable max-len */
/**
 * API to add a work management permission
 */
import validate from 'express-validation';
import _ from 'lodash';
import Joi from 'joi';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import models from '../../models';

const permissions = tcMiddleware.permissions;

const schema = {
  body: Joi.object().keys({
    policy: Joi.string().max(255).required(),
    permission: Joi.object().required(),
    projectTemplateId: Joi.number().integer().positive().required(),
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
  permissions('workManagementPermission.create'),
  (req, res, next) => {
    const entity = _.assign(req.body, {
      createdBy: req.authUser.userId,
      updatedBy: req.authUser.userId,
    });

    // Check if already exists
    return models.WorkManagementPermission.findOne({
      where: {
        policy: entity.policy,
        projectTemplateId: entity.projectTemplateId,
      },
      paranoid: false,
    })
      .then((existing) => {
        if (existing) {
          const apiErr = new Error(`Work Management Permission already exists (may be deleted) for policy "${entity.policy}" and project template id ${entity.projectTemplateId}`);
          apiErr.status = 400;
          return Promise.reject(apiErr);
        }

        // Create
        return models.WorkManagementPermission.create(entity);
      }).then((createdEntity) => {
        // Omit deletedAt, deletedBy
        res.status(201).json(_.omit(createdEntity.toJSON(), 'deletedAt', 'deletedBy'));
      })
      .catch(next);
  },
];
