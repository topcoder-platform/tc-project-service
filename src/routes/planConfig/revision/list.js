/**
 * API to get revison list
 */
import validate from 'express-validation';
import Joi from 'joi';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import util from '../../../util';
import models from '../../../models';

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
  (req, res, next) => models.PlanConfig.findAll({
    where: {
      key: req.params.key,
      version: req.params.version,
    },
    attributes: { exclude: ['deletedAt', 'deletedBy'] },
  })
    .then((planConfigs) => {
      // Not found
      if ((!planConfigs) || (planConfigs.length === 0)) {
        const apiErr = new Error(`PlanConfig not found for key ${req.params.key} version ${req.params.version}`);
        apiErr.status = 404;
        return Promise.reject(apiErr);
      }

      res.json(util.wrapResponse(req.id, planConfigs));
      return Promise.resolve();
    })
    .catch(next),
];
