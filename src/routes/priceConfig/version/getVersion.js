/**
 * API to get a priceConfig for particular version
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
  (req, res, next) => {
    util.fetchByIdFromES('priceConfigs', {
      query: {
        nested: {
          path: 'priceConfigs',
          query: {
            filtered: {
              filter: {
                bool: {
                  must: [
                    { term: { 'priceConfigs.key': req.params.key } },
                    { term: { 'priceConfigs.version': req.params.version } },
                  ],
                },
              },
            },
          },
          inner_hits: {},
        },
      },
      sort: { 'priceConfigs.revision': 'desc' },
    }, 'metadata')
      .then((data) => {
        if (data.length === 0) {
          req.log.debug('No priceConfig found in ES');
          return models.PriceConfig.findOneWithLatestRevision(req.params)
            .then((priceConfig) => {
            // Not found
              if (!priceConfig) {
                const apiErr = new Error(
                  `PriceConfig not found for key ${req.params.key} version ${req.params.version}`,
                );
                apiErr.status = 404;
                return Promise.reject(apiErr);
              }
              res.json(priceConfig);
              return Promise.resolve();
            })
            .catch(next);
        }
        req.log.debug('priceConfigs found in ES');
        res.json(data[0].inner_hits.priceConfigs.hits.hits[0]._source); // eslint-disable-line no-underscore-dangle
        return Promise.resolve();
      })
      .catch(next);
  },
];
