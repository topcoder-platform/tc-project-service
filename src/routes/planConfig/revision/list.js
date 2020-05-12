/**
 * API to get revison list
 */
import validate from 'express-validation';
import Joi from 'joi';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import models from '../../../models';
import util from '../../../util';

const permissions = tcMiddleware.permissions;

const schema = {
  params: {
    key: Joi.string().max(45).required(),
    version: Joi.number().integer().positive().required(),
  },
};

module.exports = [
  validate(schema),
  permissions('planConfig.view'),
  (req, res, next) =>

    util.fetchFromES('planConfigs')
      .then((data) => {
        if (data.planConfigs.length === 0) {
          req.log.debug('No planConfig found in ES');
          models.PlanConfig.findAll({
            where: {
              key: req.params.key,
              version: req.params.version,
            },
            attributes: { exclude: ['deletedAt', 'deletedBy'] },
          })
            .then((planConfigs) => {
              // Not found
              if ((!planConfigs) || (planConfigs.length === 0)) {
                const apiErr = new Error(
                  `PlanConfig not found for key ${req.params.key} version ${req.params.version}`,
                );
                apiErr.status = 404;
                return Promise.reject(apiErr);
              }

              res.json(planConfigs);
              return Promise.resolve();
            })
            .catch(next);
        } else {
          req.log.debug('planConfigs found in ES');
          res.json(data.planConfigs);
        }
      }).catch(next),
];
