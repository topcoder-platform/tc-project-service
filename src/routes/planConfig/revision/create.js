/**
 * API to add a planConfig revision
 */
import validate from 'express-validation';
import _ from 'lodash';
import Joi from 'joi';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import { EVENT, RESOURCES } from '../../../constants';
import util from '../../../util';
import models from '../../../models';

const permissions = tcMiddleware.permissions;

const schema = {
  params: {
    key: Joi.string().max(45).required(),
    version: Joi.number().integer().positive().required(),
  },
  body: Joi.object().keys({
    config: Joi.object().required(),

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
  permissions('planConfig.create'),
  (req, res, next) => {
    models.sequelize.transaction(() => models.PlanConfig.findOne({
      where: {
        key: req.params.key,
        version: req.params.version,
      },
      order: [['revision', 'DESC']],
    }).then((planConfig) => {
      if (planConfig) {
        const version = planConfig ? planConfig.version : 1;
        const revision = planConfig ? planConfig.revision + 1 : 1;
        const entity = _.assign(req.body, {
          version,
          revision,
          createdBy: req.authUser.userId,
          updatedBy: req.authUser.userId,
          key: req.params.key,
          config: req.body.config,
        });
        return models.PlanConfig.create(entity);
      }
      const apiErr = new Error(`PlanConfig not exists for key ${req.params.key}`);
      apiErr.status = 404;
      return Promise.reject(apiErr);
    }).then((createdEntity) => {
      util.sendResourceToKafkaBus(req,
        EVENT.ROUTING_KEY.PROJECT_METADATA_CREATE,
        RESOURCES.PLAN_CONFIG_REVISION,
        createdEntity.toJSON());
      // Omit deletedAt, deletedBy
      res.status(201).json(_.omit(createdEntity.toJSON(), 'deletedAt', 'deletedBy'));
    })
      .catch(next));
  },
];
