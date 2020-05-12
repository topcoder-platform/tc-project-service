/**
 * API to get a planConfig for particular revision
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
    revision: Joi.number().integer().positive().required(),
  },
};

module.exports = [
  validate(schema),
  permissions('planConfig.view'),
  (req, res, next) => {
    util.fetchByIdFromES('plan configs', {
      query: {
        nested: {
          path: 'planConfigs',
          query:
          {
            filtered: {
              filter: {
                bool: {
                  must: [
                    { term: { 'planConfigs.key': req.params.key } },
                    { term: { 'planConfigs.version': req.params.version } },
                    { term: { 'planConfigs.revision': req.params.revision } },
                  ],
                },
              },
            },
          },
          inner_hits: {},
        },
      },
    }, 'metadata')
      .then((data) => {
        if (data.length === 0) {
          req.log.debug('No plan config found in ES');
          models.PlanConfig.findOne({
            where: {
              key: req.params.key,
              version: req.params.version,
              revision: req.params.revision,
            },
            attributes: { exclude: ['deletedAt', 'deletedBy'] },
          })
            .then((planConfig) => {
            // Not found
              if (!planConfig) {
                const apiErr = new Error('PlanConfig not found for key' +
                `${req.params.key} version ${req.params.version} revision ${req.params.revision}`);
                apiErr.status = 404;
                return Promise.reject(apiErr);
              }

              res.json(planConfig);
              return Promise.resolve();
            })
            .catch(next);
        } else {
          req.log.debug('plan config found in ES');
          res.json(data[0].inner_hits.planConfigs.hits.hits[0]._source); // eslint-disable-line no-underscore-dangle
        }
      })
      .catch(next);
  },
];
