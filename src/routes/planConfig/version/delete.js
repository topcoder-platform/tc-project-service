/**
 * API to add a project type
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
    version: Joi.number().integer().positive().required(),
    key: Joi.string().max(45).required(),
  },
};

module.exports = [
  validate(schema),
  permissions('planConfig.create'),
  (req, res, next) => {
    models.sequelize.transaction(() => models.PlanConfig.findAll(
      {
        where: {
          key: req.params.key,
          version: req.params.version,
        },
      }).then((allRevision) => {
      if (allRevision.length === 0) {
        const apiErr = new Error(`PlanConfig not found for key ${req.params.key} version ${req.params.version}`);
        apiErr.status = 404;
        return Promise.reject(apiErr);
      }
      return models.PlanConfig.update(
        {
          deletedBy: req.authUser.userId,
        }, {
          where: {
            key: req.params.key,
            version: req.params.version,
          },
        });
    })
      .then(() => models.PlanConfig.destroy({
        where: {
          key: req.params.key,
          version: req.params.version,
        },
      }))
      .then(deleted => models.PlanConfig.findAll({
        where: {
          key: req.params.key,
          version: req.params.version,
        },
        paranoid: false,
        order: [['deletedAt', 'DESC']],
        limit: deleted,
      }))
      .then((planConfigs) => {
        _.map(planConfigs, planConfig => util.sendResourceToKafkaBus(req,
          EVENT.ROUTING_KEY.PROJECT_METADATA_DELETE,
          RESOURCES.PLAN_CONFIG_VERSION,
          _.pick(planConfig.toJSON(), 'id')));
        res.status(204).end();
      })
      .catch(next));
  },
];
