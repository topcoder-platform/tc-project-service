/**
 * API to list organization config
 */
import validate from 'express-validation';
import Joi from 'joi';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import models from '../../models';
import util from '../../util';

const permissions = tcMiddleware.permissions;

const schema = {
  query: {
    orgId: Joi.string().required(),
    configName: Joi.string().optional(),
  },
};

module.exports = [
  validate(schema),
  permissions('orgConfig.view'),
  (req, res, next) => {
    util.fetchFromES('orgConfigs')
    .then((data) => {
      // handle filters
      const filters = req.query;
      // Throw error if orgId is not present in filter
      if (!filters.orgId) {
        next(util.buildApiError('Missing filter orgId', 400));
      }
      if (!util.isValidFilter(filters, ['orgId', 'configName'])) {
        util.handleError('Invalid filters', null, req, next);
      }
      req.log.debug(filters);

      if (data.orgConfigs.length === 0) {
        req.log.debug('No orgConfig found in ES');

        // Get all organization config
        const where = filters || {};
        models.OrgConfig.findAll({
          where,
          attributes: { exclude: ['deletedAt', 'deletedBy'] },
          raw: true,
        })
        .then((orgConfigs) => {
          res.json(orgConfigs);
        })
        .catch(next);
      } else {
        req.log.debug('orgConfigs found in ES');
        res.json(data.orgConfigs);
      }
    });
  },
];
