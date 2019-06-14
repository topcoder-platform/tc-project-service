/**
 * API to list all project templates
 */
import { middleware as tcMiddleware } from 'tc-core-library-js';
import models from '../../models';
import util from '../../util';

const permissions = tcMiddleware.permissions;

module.exports = [
  permissions('projectTemplate.view'),
  (req, res, next) => {
    util.fetchFromES('projectTemplates')
    .then((data) => {
      if (data.projectTemplates.length === 0) {
        req.log.debug('No projectTemplate found in ES');
        models.ProjectTemplate.findAll({
          where: {
            deletedAt: { $eq: null },
          },
          attributes: { exclude: ['deletedAt', 'deletedBy'] },
          raw: true,
        }).then((projectTemplates) => {
          res.json(projectTemplates);
        })
        .catch(next);
      } else {
        req.log.debug('projectTemplates found in ES');
        res.json(data.projectTemplates);
      }
    });
  },
];
