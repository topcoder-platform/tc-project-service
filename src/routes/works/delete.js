/**
 * API to delete a work
 */
import _ from 'lodash';
import validate from 'express-validation';
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
    id: Joi.number().integer().positive().required(),
  },
};

module.exports = [
  validate(schema),
  permissions('work.delete'),
  (req, res, next) => {
    const projectId = req.params.projectId;
    models.sequelize.transaction(() =>
      models.PhaseWorkStream.findOne({
        where: {
          phaseId: req.params.id,
          workStreamId: req.params.workStreamId,
        },
      })
        .then((work) => {
          // Not found
          if (!work) {
            const apiErr = new Error(`work not found for work stream id ${req.params.workStreamId} ` +
          `and work id ${req.params.id}`);
            apiErr.status = 404;
            throw apiErr;
          }

          return models.ProjectPhase.findOne({
            where: {
              id: req.params.id,
              projectId,
            },
          });
        })
        .then((entity) => {
          if (!entity) {
            const apiErr = new Error(`work not found for work stream id ${req.params.workStreamId}, ` +
          `project id ${projectId} and work id ${req.params.id}`);
            apiErr.status = 404;
            return Promise.reject(apiErr);
          }
          // Update the deletedBy, then delete
          return entity.update({ deletedBy: req.authUser.userId });
        })
        .then(entity => entity.destroy()))
      .then((deleted) => {
        req.log.debug('deleted work', JSON.stringify(deleted, null, 2));

        //  emit event
        util.sendResourceToKafkaBus(
          req,
          EVENT.ROUTING_KEY.PROJECT_PHASE_REMOVED,
          RESOURCES.PHASE,
          _.pick(deleted.toJSON(), 'id'));

        res.status(204).json({});
      }).catch(err => next(err));
  },
];
