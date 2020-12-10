/**
 * API to list all project types
 */
import { middleware as tcMiddleware } from 'tc-core-library-js';
import models from '../../models';
import util from '../../util';

const permissions = tcMiddleware.permissions;

module.exports = [
  permissions('projectType.view'),
  (req, res, next) => {
    util.fetchFromES('projectTypes')
      .then((data) => {
        if (data.projectTypes.length === 0) {
          req.log.debug('No projectType found in ES');
          models.ProjectType.findAll({
            attributes: { exclude: ['deletedAt', 'deletedBy'] },
            raw: true,
          })
            .then((projectTypes) => {
              res.json(projectTypes);
            })
            .catch(next);
        } else {
          req.log.debug('projectTypes found in ES');
          res.json(data.projectTypes);
        }
      });
  },

];
