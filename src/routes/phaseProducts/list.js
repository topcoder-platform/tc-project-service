
import _ from 'lodash';
import models from '../../models';

const permissions = require('tc-core-library-js').middleware.permissions;

const retrieveFromDB = async (req, res, next) => {
  const projectId = _.parseInt(req.params.projectId);
  const phaseId = _.parseInt(req.params.phaseId);

  // check if the project and phase are exist
  return models.ProjectPhase.findOne({
    where: { id: phaseId, projectId },
    raw: true,
  }).then((countPhase) => {
    if (!countPhase) {
      const apiErr = new Error('project phase not found for project id ' +
                `${projectId} and phase id ${phaseId}`);
      apiErr.status = 404;
      throw apiErr;
    }

    const parameters = {
      projectId,
      phaseId,
    };

    return models.PhaseProduct.search(parameters, req.log)
      .then(({ rows }) => res.json(rows));
  })
    .catch(err => next(err));
};

module.exports = [
  // check permission
  permissions('project.view'),
  retrieveFromDB,
];
