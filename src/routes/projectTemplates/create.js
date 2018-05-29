/**
 * API to add a project template
 */
import validate from 'express-validation';
import _ from 'lodash';
import Joi from 'joi';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import util from '../../util';
import models from '../../models';

const permissions = tcMiddleware.permissions;

const schema = {
  body: {
    param: Joi.object().keys({
      id: Joi.any().strip(),
      name: Joi.string().max(255).required(),
      key: Joi.string().max(45).required(),
      category: Joi.string().max(45).required(),
      icon: Joi.string().max(255).required(),
      question: Joi.string().max(255).required(),
      info: Joi.string().max(255).required(),
      aliases: Joi.array().required(),
      scope: Joi.object().required(),
      phases: Joi.object().required(),
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
  permissions('projectTemplate.create'),
  (req, res, next) => {
    const entity = _.assign(req.body.param, {
      createdBy: req.authUser.userId,
      updatedBy: req.authUser.userId,
    });

    return models.ProjectTemplate.create(entity)
      .then((createdEntity) => {
        // Omit deletedAt, deletedBy
        res.status(201).json(util.wrapResponse(
          req.id, _.omit(createdEntity.toJSON(), 'deletedAt', 'deletedBy'), 1, 201));
      })
      .catch(next);
  },
];
