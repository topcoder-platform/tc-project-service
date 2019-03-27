/**
 * API to get a priceConfig list
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
  permissions('priceConfig.view'),
  (req, res, next) => models.PriceConfig.findAll({
    where: {
      key: req.params.key,
    },
    attributes: { exclude: ['deletedAt', 'deletedBy'] },
  })
    .then((priceConfigs) => {
      // Not found
      if ((!priceConfigs) || (priceConfigs.length === 0)) {
        const apiErr = new Error(`PriceConfig not found for key ${req.params.key}`);
        apiErr.status = 404;
        return Promise.reject(apiErr);
      }

      const latestPriceConfigs = {};
      priceConfigs.forEach((element) => {
        const isNewerRevision = (latestPriceConfigs[element.version] != null) &&
          (latestPriceConfigs[element.version].revision < element.revision);
        if ((latestPriceConfigs[element.version] == null) || isNewerRevision) {
          latestPriceConfigs[element.version] = element;
        }
      });
      res.json(util.wrapResponse(req.id, Object.values(latestPriceConfigs)));
      return Promise.resolve();
    })
    .catch(next),
];
