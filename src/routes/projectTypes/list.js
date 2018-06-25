/**
 * API to list all project types
 */
import { middleware as tcMiddleware } from 'tc-core-library-js';
import util from '../../util';
import models from '../../models';

const permissions = tcMiddleware.permissions;

module.exports = [
  permissions('projectType.view'),
  (req, res, next) => models.ProjectType.findAll({
    attributes: { exclude: ['deletedAt', 'deletedBy'] },
    raw: true,
  })
    .then((projectTypes) => {
      res.json(util.wrapResponse(req.id, projectTypes));
    })
    .catch(next),
];
