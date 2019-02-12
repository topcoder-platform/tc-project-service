/**
 * API to add a organization config
 */
import validate from 'express-validation';
import _ from 'lodash';
import Joi from 'joi';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import util from '../../util';
import models from '../../models';

const permissions = tcMiddleware.permissions;

const schema = {
  body: {
    param: Joi.object().keys({
      id: Joi.any().strip(),
      orgId: Joi.string().max(45).required(),
      configName: Joi.string().max(45).required(),
      configValue: Joi.string().max(512),
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
  permissions('orgConfig.create'),
  (req, res, next) => {
    const entity = _.assign(req.body.param, {
      createdBy: req.authUser.userId,
      updatedBy: req.authUser.userId,
    });

    // Check if duplicated key
    return models.OrgConfig.findOne({ where: { orgId: req.body.param.orgId, configName: req.body.param.configName } })
      .then((existing) => {
        if (existing) {
          const apiErr = new Error(`Organization config exists for orgId ${req.body.param.orgId}
            and configName ${req.body.param.configName}`);
          apiErr.status = 422;
          return Promise.reject(apiErr);
        }

        // Create
        return models.OrgConfig.create(entity);
      }).then((createdEntity) => {
        // Omit deletedAt, deletedBy
        res.status(201).json(util.wrapResponse(
          req.id, _.omit(createdEntity.toJSON(), 'deletedAt', 'deletedBy'), 1, 201));
      })
      .catch(next);
  },
];
