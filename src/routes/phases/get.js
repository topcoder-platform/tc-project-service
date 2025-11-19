
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
        include: [{
          model: models.ProjectPhaseMember,
          as: 'members',
        },
        {
          model: models.ProjectPhaseApproval,
          as: 'approvals',
        }],
      })
      .then((phase) => {
        if (!phase) {
          const err = new Error('project phase not found for project id ' +
              `${projectId} and phase id ${phaseId}`);
          err.status = 404;
          throw err;
        }
        return util.populatePhasesWithMemberDetails(phase.toJSON(), req)
          .then(result => res.json(result));
      })
      .catch(err => next(err));
  },
];
