/**
 * API to delete a work item
 */
import validate from 'express-validation';
import _ from 'lodash';
import Joi from 'joi';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import models from '../../models';
import util from '../../util';
import { EVENT, RESOURCES } from '../../constants';

const permissions = tcMiddleware.permissions;

const schema = {
  params: {
    projectId: Joi.number().integer().positive().required(),
    workStreamId: Joi.number().integer().positive().required(),
    workId: Joi.number().integer().positive().required(),
    id: Joi.number().integer().positive().required(),
  },
};

module.exports = [
  validate(schema),
  // check permission
  permissions('workItem.delete'),

  (req, res, next) => {
    const projectId = _.parseInt(req.params.projectId);
    const workStreamId = _.parseInt(req.params.workStreamId);
    const phaseId = _.parseInt(req.params.workId);
    const productId = _.parseInt(req.params.id);

    models.sequelize.transaction(() =>
      models.ProjectPhase.findOne({
        where: {
          id: phaseId,
        },
        include: [{
          model: models.WorkStream,
          where: {
            id: workStreamId,
            projectId,
          },
        },
        ],
      })
        .then((existing) => {
          if (!existing) {
            // handle 404
            const err = new Error('No active work item found for project id ' +
          `${projectId}, phase id ${phaseId} and work stream id ${workStreamId}`);
            err.status = 404;
            return Promise.reject(err);
          }

          // soft delete the record
          return models.PhaseProduct.findOne({
            where: {
              id: productId,
              projectId,
              phaseId,
              deletedAt: { $eq: null },
            },
          });
        })
        .then((existing) => {
          if (!existing) {
          // handle 404
            const err = new Error('No active work item found for project id ' +
            `${projectId}, phase id ${phaseId} and product id ${productId}`);
            err.status = 404;
            return Promise.reject(err);
          }
          return existing.update({ deletedBy: req.authUser.userId });
        })
        .then(entity => entity.destroy()))
      .then((deleted) => {
        req.log.debug('deleted work item', JSON.stringify(deleted, null, 2));
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
