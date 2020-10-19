

import _ from 'lodash';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import models from '../../models';
import util from '../../util';
import { EVENT, RESOURCES } from '../../constants';

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
      }).then((existing) => {
        if (!existing) {
          // handle 404
          const err = new Error('No active phase product found for project id ' +
            `${projectId}, phase id ${phaseId} and product id ${productId}`);
          err.status = 404;
          return Promise.reject(err);
        }
        return existing.update({ deletedBy: req.authUser.userId });
      })
        .then(entity => entity.destroy()))
      .then((deleted) => {
        req.log.debug('deleted phase product', JSON.stringify(deleted, null, 2));
        // emit the event
        util.sendResourceToKafkaBus(
          req,
          EVENT.ROUTING_KEY.PROJECT_PHASE_PRODUCT_REMOVED,
          RESOURCES.PHASE_PRODUCT,
          _.pick(deleted.toJSON(), 'id'));

        res.status(204).json({});
      })
      .catch(err => next(err));
  },
];
