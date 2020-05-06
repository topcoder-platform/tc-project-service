/**
 * API to list all work management permissions
 */
import validate from 'express-validation';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import Joi from 'joi';
import util from '../../util';
import models from '../../models';

const permissions = tcMiddleware.permissions;

const schema = {
  query: {
    filter: Joi.string().required(),
  },
};

module.exports = [
  validate(schema),
  permissions('workManagementPermission.view'),
  (req, res, next) => {
    // handle filters
    const filters = util.parseQueryFilter(req.query.filter);
    // Throw error if projectTemplateId is not present in filter
    if (!filters.projectTemplateId) {
      return next(util.buildApiError('Missing filter projectTemplateId', 400));
    }
    if (!util.isValidFilter(filters, ['projectTemplateId'])) {
      return util.handleError('Invalid filters', null, req, next);
    }
    req.log.debug(filters);

    return models.WorkManagementPermission.findAll({
      where: filters,
      attributes: { exclude: ['deletedAt', 'deletedBy'] },
      raw: true,
    })
      .then((result) => {
        res.json(result);
      })
      .catch(next);
  },
];
