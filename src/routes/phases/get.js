
import _ from 'lodash';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import util from '../../util';
import models from '../../models';

const permissions = tcMiddleware.permissions;

module.exports = [
  permissions('project.view'),
  (req, res, next) => {
    const projectId = _.parseInt(req.params.projectId);
    const phaseId = _.parseInt(req.params.phaseId);
    return models.ProjectPhase
      .findOne({
        where: { id: phaseId, projectId },
        raw: true,
      })
      .then((phase) => {
        if (!phase) {
          // handle 404
          const err = new Error('project phase not found for project id ' +
                `${projectId} and phase id ${phaseId}`);
          err.status = 404;
          throw err;
        }
        res.json(util.wrapResponse(req.id, phase));
      })
      .catch(err => next(err));
  },
];
