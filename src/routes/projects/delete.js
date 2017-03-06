
import _ from 'lodash';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import { EVENT } from '../../constants';
import models from '../../models';

/**
 * API to delete a project member.
 *
 */

const permissions = tcMiddleware.permissions;

module.exports = [
  permissions('project.delete'),
  (req, res, next) => {
    const projectId = _.parseInt(req.params.projectId);

    models.sequelize.transaction(t =>
      // soft delete the record
       models.Project.destroy({
         where: { id: projectId },
         cascade: true,
         transaction: t,
       })
        .then((count) => {
          if (count === 0) {
            const err = new Error('Project not found');
            err.status = 404;
            next(err);
          } else {
            req.app.services.pubsub.publish(
              EVENT.ROUTING_KEY.PROJECT_DELETED,
              { id: projectId },
              { correlationId: req.id },
            );
            // emit event
            req.app.emit(EVENT.ROUTING_KEY.PROJECT_DELETED, { req, id: projectId });
            res.status(204).json({});
          }
        })
        .catch(err => next(err)));
  },
];
