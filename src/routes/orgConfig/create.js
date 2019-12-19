/**
 * API to add a organization config
 */
import validate from 'express-validation';
import _ from 'lodash';
import Joi from 'joi';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import { EVENT, RESOURCES } from '../../constants';
import util from '../../util';
import models from '../../models';

const permissions = tcMiddleware.permissions;

const schema = {

  body: Joi.object().keys({
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

};

module.exports = [
  validate(schema),
  permissions('orgConfig.create'),
  (req, res, next) => {
    const entity = _.assign(req.body, {
      createdBy: req.authUser.userId,
      updatedBy: req.authUser.userId,
    });

    // Check if duplicated key
    return models.OrgConfig.findOne({ where: { orgId: req.body.orgId, configName: req.body.configName } })
      .then((existing) => {
        if (existing) {
          const apiErr = new Error(`Organization config exists for orgId ${req.body.orgId}
            and configName ${req.body.configName}`);
          apiErr.status = 400;
          return Promise.reject(apiErr);
        }

        // Create
        return models.OrgConfig.create(entity);
      }).then((createdEntity) => {
        util.sendResourceToKafkaBus(req,
          EVENT.ROUTING_KEY.PROJECT_METADATA_CREATE,
          RESOURCES.ORG_CONFIG,
          createdEntity.toJSON());
        // Omit deletedAt, deletedBy
        res.status(201).json(_.omit(createdEntity.toJSON(), 'deletedAt', 'deletedBy'));
      })
      .catch(next);
  },
];
