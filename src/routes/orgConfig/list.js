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
    const orgIds = filters.orgId.split(',');

    const where = { orgId: { $in: orgIds } };
    if (filters.configName) {
      where.configName = filters.configName;
    }
    return models.OrgConfig.findAll({
      where,
      attributes: { exclude: ['deletedAt', 'deletedBy'] },
      raw: true,
    })
      .then(orgConfigs => res.json(orgConfigs))
      .catch(next);
  },
];
