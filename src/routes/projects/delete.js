
import _ from 'lodash';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import { EVENT, RESOURCES } from '../../constants';
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

    models.sequelize.transaction(() =>
      models.Project.findByPk(req.params.projectId)
        .then((entity) => {
          if (!entity) {
            const apiErr = new Error(`Project not found for id ${projectId}`);
            apiErr.status = 404;
            return Promise.reject(apiErr);
          }
          // Update the deletedBy, then delete
          return entity.update({ deletedBy: req.authUser.userId });
        })
        .then(project => project.destroy({ cascade: true })))
      .then((project) => {
        // emit event
        req.app.emit(EVENT.ROUTING_KEY.PROJECT_DELETED,
          { req, project: _.assign({ resource: RESOURCES.PROJECT }, _.pick(project.toJSON(), 'id')),
          });
        res.status(204).json({});
      })
      .catch(err => next(err));
  },
];
