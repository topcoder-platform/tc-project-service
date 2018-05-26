

import _ from 'lodash';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import models from '../../models';
import { EVENT } from '../../constants';

const permissions = tcMiddleware.permissions;

module.exports = [
  // check permission
  permissions('project.deleteProjectPhase'),

  (req, res, next) => {
    const projectId = _.parseInt(req.params.projectId);
    const phaseId = _.parseInt(req.params.phaseId);

    models.sequelize.transaction(() =>
      // soft delete the record
      models.ProjectPhase.findOne({
        where: {
          id: phaseId,
          projectId,
          deletedAt: { $eq: null },
        },
      }).then(existing => new Promise((accept, reject) => {
        if (!existing) {
          // handle 404
          const err = new Error('no active project phase found for project id ' +
            `${projectId} and phase id ${phaseId}`);
          err.status = 404;
          reject(err);
        } else {
          _.extend(existing, { deletedBy: req.authUser.userId, deletedAt: Date.now() });
          existing.save().then(accept).catch(reject);
        }
      })).then((deleted) => {
        req.log.debug('deleted project phase', JSON.stringify(deleted, null, 2));

        // Send events to buses
        req.app.services.pubsub.publish(
          EVENT.ROUTING_KEY.PROJECT_PHASE_REMOVED,
          deleted,
          { correlationId: req.id },
        );
        req.app.emit(EVENT.ROUTING_KEY.PROJECT_PHASE_REMOVED, { req, deleted });

        res.status(204).json({});
      }).catch(err => next(err)));
  },
];

