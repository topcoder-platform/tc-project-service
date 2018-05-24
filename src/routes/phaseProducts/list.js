
import _ from 'lodash';

import models from '../../models';
import util from '../../util';

const permissions = require('tc-core-library-js').middleware.permissions;

module.exports = [
  // check permission
  permissions('project.view'),

  (req, res, next) => {
    const projectId = _.parseInt(req.params.projectId);
    const phaseId = _.parseInt(req.params.phaseId);

    return models.ProjectPhase.findOne({
      where: { id: phaseId, projectId, deletedAt: { $eq: null } },
    }).then((existingPhase) => {
      if (!existingPhase) {
        const err = new Error(`active project phase not found for project id ${projectId}` +
          ` and phase id ${phaseId}`);
        err.status = 404;
        throw err;
      }
      return models.PhaseProduct.findAll({
        where: {
          projectId,
          phaseId,
          deletedAt: { $eq: null },
        },
      });
    }).then((products) => {
      if (!products) {
        res.json(util.wrapResponse(req.id, [], 0));
      } else {
        res.json(util.wrapResponse(req.id, products, products.length));
      }
    }).catch(err => next(err));
  },
];
