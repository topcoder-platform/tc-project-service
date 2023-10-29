/**
 * API to update a project type
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
  permissions('projectType.edit'),
  (req, res, next) => {
    const entityToUpdate = _.assign(req.body, {
      updatedBy: req.authUser.userId,
    });

    return models.ProjectType.findOne({
      where: {
        key: req.params.key,
      },
      attributes: { exclude: ['deletedAt', 'deletedBy'] },
    })
      .then((projectType) => {
        // Not found
        if (!projectType) {
          const apiErr = new Error(`Project type not found for key ${req.params.key}`);
          apiErr.status = 404;
          return Promise.reject(apiErr);
        }

        return projectType.update(entityToUpdate);
      })
      .then((projectType) => {
        util.sendResourceToKafkaBus(
          req,
          EVENT.ROUTING_KEY.PROJECT_METADATA_UPDATE,
          RESOURCES.PROJECT_TYPE,
          projectType.get({ plain: true }),
        );

        res.json(projectType);
        return Promise.resolve();
      })
      .catch(next);
  },
];
