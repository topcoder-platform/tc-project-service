/**
 * API to list organization config
 */
import { middleware as tcMiddleware } from 'tc-core-library-js';
import models from '../../models';
import util from '../../util';

const permissions = tcMiddleware.permissions;

module.exports = [
  permissions('orgConfig.view'),
  (req, res, next) => {
    // handle filters
    const filters = util.parseQueryFilter(req.query.filter);
    if (!util.isValidFilter(filters, ['orgId', 'configName'])) {
      return util.handleError('Invalid filters', null, req, next);
    }
    req.log.debug(filters);
    // Get all organization config
    const where = filters || {};
    return models.OrgConfig.findAll({
      where,
      attributes: { exclude: ['deletedAt', 'deletedBy'] },
      raw: true,
    })
    .then((orgConfigs) => {
      res.json(util.wrapResponse(req.id, orgConfigs));
    })
    .catch(next);
  },
];
