/**
 * API to list all project templates
 */
import { middleware as tcMiddleware } from 'tc-core-library-js';
import util from '../../util';
import models from '../../models';

const permissions = tcMiddleware.permissions;

module.exports = [
  permissions('projectTemplate.view'),
  (req, res, next) => models.ProjectTemplate.findAll({
    where: {
      deletedAt: { $eq: null },
    },
    attributes: { exclude: ['deletedAt', 'deletedBy'] },
    raw: true,
  })
    .then((projectTemplates) => {
      res.json(util.wrapResponse(req.id, projectTemplates));
    })
    .catch(next),
];
