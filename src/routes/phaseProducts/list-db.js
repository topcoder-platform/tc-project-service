import _ from 'lodash';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import models from '../../models';

const permissions = tcMiddleware.permissions;

module.exports = [
  permissions('project.view'),
  async (req, res, next) => {
    const projectId = _.parseInt(req.params.projectId);
    const phaseId = _.parseInt(req.params.phaseId);

    // check if the project and phase are exist
    try {
      const countProject = await models.Project.count({ where: { id: projectId } });
      if (countProject === 0) {
        const apiErr = new Error(`active project not found for project id ${projectId}`);
        apiErr.status = 404;
        throw apiErr;
      }

      const countPhase = await models.ProjectPhase.count({ where: { id: phaseId } });
      if (countPhase === 0) {
        const apiErr = new Error(`active project phase not found for id ${phaseId}`);
        apiErr.status = 404;
        throw apiErr;
      }
    } catch (err) {
      return next(err);
    }

    const parameters = {
      projectId,
      phaseId,
    };

    try {
      const { rows } = await models.PhaseProduct.search(parameters, req.log);
      return res.json(rows);
    } catch (err) {
      return next(err);
    }
  },
];
