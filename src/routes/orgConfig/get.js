/**
 * API to get a organization config
 */
import validate from 'express-validation';
import Joi from 'joi';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import models from '../../models';
import util from '../../util';

const permissions = tcMiddleware.permissions;

const schema = {
  params: {
    id: Joi.number().integer().positive().required(),
  },
};

module.exports = [
  validate(schema),
  permissions('orgConfig.view'),
  (req, res, next) => {
    util.fetchByIdFromES('orgConfigs', {
      query: {
        nested: {
          path: 'orgConfigs',
          query: {
            match: { 'orgConfigs.id': req.params.id },
          },
          inner_hits: {},
        },
      },
    }, 'metadata')
      .then((data) => {
        if (data.length === 0) {
          req.log.debug('No orgConfig found in ES');
          models.OrgConfig.findOne({
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

              res.json(orgConfig);
              return Promise.resolve();
            })
            .catch(next);
        } else {
          req.log.debug('orgConfigs found in ES');
          res.json(data[0].inner_hits.orgConfigs.hits.hits[0]._source); // eslint-disable-line no-underscore-dangle
        }
      })
      .catch(next);
  },


];
