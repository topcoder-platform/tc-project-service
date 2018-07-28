

import _ from 'lodash';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import models from '../../models';
import { EVENT } from '../../constants';

const permissions = tcMiddleware.permissions;

module.exports = [
  // check permission
  permissions('project.deletePhaseProduct'),

  (req, res, next) => {
    const projectId = _.parseInt(req.params.projectId);
    const phaseId = _.parseInt(req.params.phaseId);
    const productId = _.parseInt(req.params.productId);

    models.sequelize.transaction(() =>
      // soft delete the record
      models.PhaseProduct.findOne({
        where: {
          id: productId,
          projectId,
          phaseId,
          deletedAt: { $eq: null },
        },
      }).then(existing => new Promise((accept, reject) => {
        if (!existing) {
          // handle 404
          const err = new Error('No active phase product found for project id ' +
            `${projectId}, phase id ${phaseId} and product id ${productId}`);
          err.status = 404;
          reject(err);
        } else {
          _.extend(existing, { deletedBy: req.authUser.userId, deletedAt: Date.now() });
          existing.save().then(accept).catch(reject);
        }
      })))
      .then((deleted) => {
        req.log.debug('deleted phase product', JSON.stringify(deleted, null, 2));

        // Send events to buses
        req.app.services.pubsub.publish(
          EVENT.ROUTING_KEY.PROJECT_PHASE_PRODUCT_REMOVED,
          deleted,
          { correlationId: req.id },
        );
        req.app.emit(EVENT.ROUTING_KEY.PROJECT_PHASE_PRODUCT_REMOVED, { req, deleted });

        res.status(204).json({});
      }).catch(err => next(err));
  },
];
