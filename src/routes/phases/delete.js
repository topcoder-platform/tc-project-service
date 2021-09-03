

import _ from 'lodash';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import models from '../../models';
import util from '../../util';
import { EVENT, RESOURCES } from '../../constants';

const permissions = tcMiddleware.permissions;

module.exports = [
  // check permission
  permissions('project.deleteProjectPhase'),

  (req, res, next) => {
    const projectId = _.parseInt(req.params.projectId);
    const phaseId = _.parseInt(req.params.phaseId);
    let result;

    models.sequelize.transaction(transaction =>
      // soft delete the record
      models.ProjectPhase.findOne({
        where: {
          id: phaseId,
          projectId,
          deletedAt: { $eq: null },
        },
      }).then((existing) => {
        if (!existing) {
          // handle 404
          const err = new Error('no active project phase found for project id ' +
            `${projectId} and phase id ${phaseId}`);
          err.status = 404;
          return Promise.reject(err);
        }
        return existing.update({ deletedBy: req.authUser.userId }, { transaction });
      })
        .then(entity => entity.destroy({ transaction }))
        .then((entity) => { result = entity.toJSON(); return entity; })
        .then(entity => util.updateTopObjectPropertyFromES(_.get(entity.toJSON(), 'projectId'),
          util.generateDeleteDocFunction(_.get(entity.toJSON(), 'id'), 'phases')).then(() => entity)))
      .then((deleted) => {
        req.log.debug('deleted project phase', JSON.stringify(deleted, null, 2));

        //  emit event
        util.sendResourceToKafkaBus(
          req,
          EVENT.ROUTING_KEY.PROJECT_PHASE_REMOVED,
          RESOURCES.PHASE,
          deleted.toJSON(),
        );

        res.status(204).json({});
      }).catch((err) => {
        if (result) {
          util.publishError(result, 'phase.delete', req.log);
        }
        next(err);
      });
  },
];
