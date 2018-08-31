/**
 * API to list all metadata
 */
import { middleware as tcMiddleware } from 'tc-core-library-js';
import util from '../../util';
import models from '../../models';

const permissions = tcMiddleware.permissions;

module.exports = [
  permissions('metadata.list'),
  (req, res, next) => {
    const query = {
      attributes: { exclude: ['deletedAt', 'deletedBy'] },
      raw: true,
    };

    return Promise.all([
      models.ProjectTemplate.findAll(query),
      models.ProductTemplate.findAll(query),
      models.MilestoneTemplate.findAll(query),
      models.ProjectType.findAll(query),
      models.ProductCategory.findAll(query),
    ])
    .then((results) => {
      res.json(util.wrapResponse(req.id, {
        projectTemplates: results[0],
        productTemplates: results[1],
        milestoneTemplates: results[2],
        projectTypes: results[3],
        productCategories: results[4],
      }));
    })
    .catch(next);
  },
];
