/**
 * API to add a new version of planConfig
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
    models.sequelize.transaction(() => models.PlanConfig.findAll({
      where: {
        key: req.params.key,
      },
      order: [['version', 'DESC']],
    }).then((planConfigs) => {
      let latestVersion = 1;
      if (planConfigs.length !== 0) {
        const latestVersionPlanConfig = planConfigs.reduce((prev, current) =>
          ((prev.version < current.version) ? current : prev));
        latestVersion = latestVersionPlanConfig.version + 1;
      }

      const entity = _.assign(req.body, {
        version: latestVersion,
        revision: 1,
        createdBy: req.authUser.userId,
        updatedBy: req.authUser.userId,
        key: req.params.key,
        config: req.body.config,
      });
      return models.PlanConfig.create(entity);
    }).then((createdEntity) => {
      util.sendResourceToKafkaBus(req,
        EVENT.ROUTING_KEY.PROJECT_METADATA_CREATE,
        RESOURCES.PLAN_CONFIG_VERSION,
        createdEntity.toJSON());
      // Omit deletedAt, deletedBy
      res.status(201).json(_.omit(createdEntity.toJSON(), 'deletedAt', 'deletedBy'));
    })
      .catch(next));
  },
];
