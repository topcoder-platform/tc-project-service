/**
 * API to delete a timeline
 */
import validate from 'express-validation';
import Joi from 'joi';
import _ from 'lodash';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import models from '../../models';
import util from '../../util';
import { EVENT, RESOURCES } from '../../constants';
import validateTimeline from '../../middlewares/validateTimeline';

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
  validateTimeline.validateTimelineIdParam,
  permissions('timeline.delete'),
  (req, res, next) => {
    const timeline = req.timeline;

    return models.sequelize.transaction(() =>
      // Update the deletedBy, then delete
      timeline.update({ deletedBy: req.authUser.userId })
        .then(() => timeline.destroy())
        // Cascade delete the milestones
        .then(() => models.Milestone.update({ deletedBy: req.authUser.userId }, { where: { timelineId: timeline.id } }))
        .then(() => models.Milestone.destroy({ where: { timelineId: timeline.id } }))
        .then(itemsDeleted => models.Milestone.findAll({
          where: {
            timelineId: timeline.id,
          },
          attributes: ['id'],
          paranoid: false,
          order: [['deletedAt', 'DESC']],
          limit: itemsDeleted,
        })),
    )
      .then((milestones) => {
        // emit the event
        util.sendResourceToKafkaBus(
          req,
          EVENT.ROUTING_KEY.TIMELINE_REMOVED,
          RESOURCES.TIMELINE,
          { id: req.params.timelineId });

        // emit the event for milestones
        _.map(milestones, milestone => util.sendResourceToKafkaBus(req,
          EVENT.ROUTING_KEY.MILESTONE_REMOVED,
          RESOURCES.MILESTONE,
          milestone.toJSON()));

        // Write to response
        res.status(204).end();
        return Promise.resolve();
      })
      .catch(next);
  },
];
