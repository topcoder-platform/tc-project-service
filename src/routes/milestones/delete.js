/**
 * API to delete a timeline
 */
import validate from 'express-validation';
import Joi from 'joi';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import models from '../../models';
import util from '../../util';
import { EVENT, RESOURCES } from '../../constants';
import validateTimeline from '../../middlewares/validateTimeline';

const permissions = tcMiddleware.permissions;

const schema = {
  params: {
    timelineId: Joi.number().integer().positive().required(),
    milestoneId: Joi.number().integer().positive().required(),
  },
};

module.exports = [
  validate(schema),
  // Validate and get projectId from the timelineId param, and set to request params for
  // checking by the permissions middleware
  validateTimeline.validateTimelineIdParam,
  permissions('milestone.delete'),
  (req, res, next) => {
    const where = {
      timelineId: req.params.timelineId,
      id: req.params.milestoneId,
    };

    return models.sequelize.transaction(() =>
      // Find the milestone
      models.Milestone.findOne({
        where,
      })
        .then((milestone) => {
          // Not found
          if (!milestone) {
            const apiErr = new Error(`Milestone not found for milestone id ${req.params.milestoneId}`);
            apiErr.status = 404;
            return Promise.reject(apiErr);
          }

          // Update the deletedBy, and soft delete
          return milestone.update({ deletedBy: req.authUser.userId })
            .then(() => milestone.destroy());
        }),
    )
    .then((deleted) => {
      // Send event to bus
      req.log.debug('Sending event to RabbitMQ bus for milestone %d', deleted.id);
      req.app.services.pubsub.publish(EVENT.ROUTING_KEY.MILESTONE_REMOVED,
        deleted,
        { correlationId: req.id },
      );

      // emit the event
      util.sendResourceToKafkaBus(
        req,
        EVENT.ROUTING_KEY.MILESTONE_REMOVED,
        RESOURCES.MILESTONE,
        { id: deleted.id });

      // Write to response
      res.status(204).end();
      return Promise.resolve();
    })
    .catch(next);
  },
];
