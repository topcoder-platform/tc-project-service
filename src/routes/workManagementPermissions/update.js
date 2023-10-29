/* eslint-disable max-len */
/**
 * API to update a work management permission
 */
import validate from 'express-validation';
import _ from 'lodash';
import Joi from 'joi';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import models from '../../models';

const permissions = tcMiddleware.permissions;

const schema = {
  params: {
    id: Joi.number().integer().positive().required(),
  },
  body: Joi.object().keys({
    policy: Joi.string().max(255).optional(),
    permission: Joi.object().optional(),
    projectTemplateId: Joi.number().integer().positive().optional(),
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
  permissions('workManagementPermission.edit'),
  (req, res, next) => {
    const entityToUpdate = _.assign(req.body, {
      updatedBy: req.authUser.userId,
    });

    let permissionToUpdate;

    return models.sequelize.transaction(() => // Get work management permission
      models.WorkManagementPermission.findOne({
        where: {
          id: req.params.id,
        },
        attributes: { exclude: ['deletedAt', 'deletedBy'] },
      })
        .then((permission) => {
        // Not found
          if (!permission) {
            const apiErr = new Error(`Work Management Permission not found for id ${req.params.id}`);
            apiErr.status = 404;
            return Promise.reject(apiErr);
          }

          permissionToUpdate = permission;
          return models.WorkManagementPermission.findOne({
            where: {
              policy: entityToUpdate.policy,
              projectTemplateId: entityToUpdate.projectTemplateId,
              id: { $ne: req.params.id },
            },
            paranoid: false,
          });
        })
        .then((existing) => {
          if (existing) {
            const apiErr = new Error(`Work Management Permission already exists (may be deleted) for policy "${entityToUpdate.policy}" and project template id ${entityToUpdate.projectTemplateId}`);
            apiErr.status = 400;
            return Promise.reject(apiErr);
          }

          return permissionToUpdate.update(entityToUpdate);
        }),
    )
      .then((updated) => {
        res.json(updated);
        return Promise.resolve();
      })
      .catch(next);
  },
];
