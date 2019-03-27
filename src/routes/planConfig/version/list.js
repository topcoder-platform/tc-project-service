/**
 * API to get a planConfig list
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
  },
};

module.exports = [
  validate(schema),
  permissions('planConfig.view'),
  (req, res, next) => models.PlanConfig.findAll({
    where: {
      key: req.params.key,
    },
    attributes: { exclude: ['deletedAt', 'deletedBy'] },
  })
    .then((planConfigs) => {
      // Not found
      if ((!planConfigs) || (planConfigs.length === 0)) {
        const apiErr = new Error(`PlanConfig not found for key ${req.params.key}`);
        apiErr.status = 404;
        return Promise.reject(apiErr);
      }

      const latestPlanConfigs = {};
      planConfigs.forEach((element) => {
        const isNewerRevision = (latestPlanConfigs[element.version] != null) &&
          (latestPlanConfigs[element.version].revision < element.revision);
        if ((latestPlanConfigs[element.version] == null) || isNewerRevision) {
          latestPlanConfigs[element.version] = element;
        }
      });
      res.json(util.wrapResponse(req.id, Object.values(latestPlanConfigs)));
      return Promise.resolve();
    })
    .catch(next),
];
