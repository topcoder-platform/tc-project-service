/**
 * API to delete a revsion
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
    revision: Joi.number().integer().positive().required(),
  },
};


module.exports = [
  validate(schema),
  permissions('priceConfig.delete'),
  (req, res, next) => {
    models.sequelize.transaction(() => models.PriceConfig.findOne(
      {
        where: {
          key: req.params.key,
          version: req.params.version,
          revision: req.params.revision,
        },
      }).then((priceConfig) => {
      if (!priceConfig) {
        const apiErr = new Error('PriceConfig not found for key' +
            ` ${req.params.key} version ${req.params.version} revision ${req.params.revision}`);
        apiErr.status = 404;
        return Promise.reject(apiErr);
      }
      return priceConfig.update({
        deletedBy: req.authUser.userId,
      });
    }).then(priceConfig =>
      priceConfig.destroy(),
    ).then((priceConfig) => {
      util.sendResourceToKafkaBus(req,
        EVENT.ROUTING_KEY.PROJECT_METADATA_DELETE,
        RESOURCES.PRICE_CONFIG_REVISION,
        _.pick(priceConfig.toJSON(), 'id'));
      res.status(204).end();
    })
      .catch(next));
  },
];
