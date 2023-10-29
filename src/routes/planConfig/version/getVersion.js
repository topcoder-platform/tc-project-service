/**
 * API to get a planConfig for particular version
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
  permissions('planConfig.view'),
  (req, res, next) =>
    util.fetchByIdFromES('planConfigs', {
      query: {
        nested: {
          path: 'planConfigs',
          query: {
            filtered: {
              filter: {
                bool: {
                  must: [
                    { term: { 'planConfigs.key': req.params.key } },
                    { term: { 'planConfigs.version': req.params.version } },
                  ],
                },
              },
            },
          },
          inner_hits: {},
        },
      },
      sort: { 'planConfigs.revision': 'desc' },
    }, 'metadata')
      .then((data) => {
        if (data.length === 0) {
          req.log.debug('No planConfig found in ES');
          return models.PlanConfig.findOneWithLatestRevision(req.params)
            .then((planConfig) => {
              // Not found
              if (!planConfig) {
                const apiErr = new Error(
                  `PlanConfig not found for key ${req.params.key} version ${req.params.version}`,
                );
                apiErr.status = 404;
                return Promise.reject(apiErr);
              }
              res.json(planConfig);
              return Promise.resolve();
            })
            .catch(next);
        }
        req.log.debug('planConfigs found in ES');
        res.json(data[0].inner_hits.planConfigs.hits.hits[0]._source); // eslint-disable-line no-underscore-dangle
        return Promise.resolve();
      })
      .catch(next),
];
