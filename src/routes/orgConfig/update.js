/**
 * API to update a organization config
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
  params: {
    id: Joi.number().integer().positive().required(),
  },
  body: Joi.object().keys({
    id: Joi.any().strip(),
    orgId: Joi.string().max(45).optional(),
    configName: Joi.string().max(45).optional(),
    configValue: Joi.string().max(512).optional(),
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
  permissions('orgConfig.edit'),
  (req, res, next) => {
    const entityToUpdate = _.assign(req.body, {
      updatedBy: req.authUser.userId,
    });

    return models.OrgConfig.findOne({
      where: {
        id: req.params.id,
      },
      attributes: { exclude: ['deletedAt', 'deletedBy'] },
    })
      .then((orgConfig) => {
        // Not found
        if (!orgConfig) {
          const apiErr = new Error(`Organization config not found for id ${req.params.id}`);
          apiErr.status = 404;
          return Promise.reject(apiErr);
        }

        return orgConfig.update(entityToUpdate);
      })
      .then((orgConfig) => {
        util.sendResourceToKafkaBus(req,
          EVENT.ROUTING_KEY.PROJECT_METADATA_UPDATE,
          RESOURCES.ORG_CONFIG,
          orgConfig.get({ plain: true }),
        );
        res.json(orgConfig);
        return Promise.resolve();
      })
      .catch(next);
  },
];
