/**
 * API to add a project type
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
  body: Joi.object().keys({
    key: Joi.string().max(45).required(),
    displayName: Joi.string().max(255).required(),
    icon: Joi.string().max(255).required(),
    question: Joi.string().max(255).required(),
    info: Joi.string().max(1024).required(),
    aliases: Joi.array().required(),
    disabled: Joi.boolean().optional(),
    hidden: Joi.boolean().optional(),
    metadata: Joi.object().required(),
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
  permissions('projectType.create'),
  (req, res, next) => {
    const entity = _.assign(req.body, {
      createdBy: req.authUser.userId,
      updatedBy: req.authUser.userId,
    });

    // Check if duplicated key
    return models.ProjectType.findByPk(req.body.key, { paranoid: false })
      .then((existing) => {
        if (existing) {
          const apiErr = new Error(`Project type already exists (may be deleted) for key ${req.body.key}`);
          apiErr.status = 400;
          return Promise.reject(apiErr);
        }

        // Create
        return models.ProjectType.create(entity);
      }).then((createdEntity) => {
        // emit event
        util.sendResourceToKafkaBus(
          req,
          EVENT.ROUTING_KEY.PROJECT_METADATA_CREATE,
          RESOURCES.PROJECT_TYPE,
          createdEntity.toJSON());
        // Omit deletedAt, deletedBy
        res.status(201).json(_.omit(createdEntity.toJSON(), 'deletedAt', 'deletedBy'));
      })
      .catch(next);
  },
];
