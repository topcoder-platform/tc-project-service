/**
 * API to add a new version of priceConfig
 */
import validate from 'express-validation';
import _ from 'lodash';
import Joi from 'joi';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import util from '../../../util';
import models from '../../../models';

const permissions = tcMiddleware.permissions;

const schema = {
  params: {
    key: Joi.string().max(45).required(),
  },
  body: {
    param: Joi.object().keys({
      config: Joi.object().required(),

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
  permissions('priceConfig.create'),
  (req, res, next) => {
    models.sequelize.transaction(() => models.PriceConfig.findAll({
      where: {
        key: req.params.key,
      },
      order: [['version', 'DESC']],
    }).then((priceConfigs) => {
      let latestVersion = 1;
      if (priceConfigs.length !== 0) {
        const latestVersionPriceConfig = priceConfigs.reduce((prev, current) =>
          ((prev.version < current.version) ? current : prev));
        latestVersion = latestVersionPriceConfig.version + 1;
      }

      const entity = _.assign(req.body.param, {
        version: latestVersion,
        revision: 1,
        createdBy: req.authUser.userId,
        updatedBy: req.authUser.userId,
        key: req.params.key,
        config: req.body.param.config,
      });
      return models.PriceConfig.create(entity);
    }).then((createdEntity) => {
        // Omit deletedAt, deletedBy
      res.status(201).json(util.wrapResponse(
          req.id, _.omit(createdEntity.toJSON(), 'deletedAt', 'deletedBy'), 1, 201));
    })
      .catch(next));
  },
];
