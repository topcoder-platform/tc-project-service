/**
 * API to list all project types
 */
import { middleware as tcMiddleware } from 'tc-core-library-js';
import models from '../../models';

const permissions = tcMiddleware.permissions;

module.exports = [
  permissions('projectType.view'),
  (req, res, next) =>
    models.ProjectType.findAll({
      where: {
        deletedAt: { $eq: null },
        disabled: false,
        hidden: false,
      },
      attributes: { exclude: ['deletedAt', 'deletedBy'] },
      raw: true,
    })
      .then(projectTypes => res.json(projectTypes))
      .catch(next),
];
