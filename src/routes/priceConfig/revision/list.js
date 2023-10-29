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
  permissions('priceConfig.view'),
  (req, res, next) =>
    util.fetchFromES('priceConfigs')
      .then((data) => {
        if (data.priceConfigs.length === 0) {
          req.log.debug('No priceConfig found in ES');
          models.PriceConfig.findAll({
            where: {
              key: req.params.key,
              version: req.params.version,
            },
            attributes: { exclude: ['deletedAt', 'deletedBy'] },
          })
            .then((priceConfigs) => {
              // Not found
              if ((!priceConfigs) || (priceConfigs.length === 0)) {
                const apiErr = new Error(
                  `PriceConfig not found for key ${req.params.key} version ${req.params.version}`,
                );
                apiErr.status = 404;
                return Promise.reject(apiErr);
              }

              res.json(priceConfigs);
              return Promise.resolve();
            })
            .catch(next);
        } else {
          req.log.debug('priceConfigs found in ES');
          res.json(data.priceConfigs);
        }
      }).catch(next),

];
