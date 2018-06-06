/**
 * API to delete a timeline
 */
import validate from 'express-validation';
import Joi from 'joi';
import _ from 'lodash';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import models from '../../models';
import { EVENT } from '../../constants';
import util from '../../util';

const permissions = tcMiddleware.permissions;

const schema = {
  params: {
    timelineId: Joi.number().integer().positive().required(),
  },
};

module.exports = [
  validate(schema),
  // Validate and get projectId from the timelineId param, and set to request params for
  // checking by the permissions middleware
  util.validateTimelineIdParam,
  permissions('timeline.delete'),
  (req, res, next) => {
    const timeline = req.timeline;
    const deleted = _.omit(timeline.toJSON(), ['deletedAt', 'deletedBy']);

    return models.sequelize.transaction(() =>
      // Update the deletedBy, then delete
      timeline.update({ deletedBy: req.authUser.userId })
        .then(() => timeline.destroy())
        // Cascade delete the milestones
        .then(() => models.Milestone.update({ deletedBy: req.authUser.userId }, { where: { timelineId: timeline.id } }))
        .then(() => models.Milestone.destroy({ where: { timelineId: timeline.id } }))
        .then(() => {
          // Send event to bus
          req.log.debug('Sending event to RabbitMQ bus for timeline %d', deleted.id);
          req.app.services.pubsub.publish(EVENT.ROUTING_KEY.TIMELINE_REMOVED,
            deleted,
            { correlationId: req.id },
          );

          // Write to response
          res.status(204).end();
          return Promise.resolve();
        })
        .catch(next),
    );
  },
];
