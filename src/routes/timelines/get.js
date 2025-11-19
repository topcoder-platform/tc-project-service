/**
 * API to get a timeline
 */
import validate from 'express-validation';
import Joi from 'joi';
import _ from 'lodash';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import validateTimeline from '../../middlewares/validateTimeline';

const permissions = tcMiddleware.permissions;

const schema = {
  params: {
    timelineId: Joi.number().integer().positive().required(),
  },
};

// Load the milestones
const loadMilestones = timeline =>
  timeline.getMilestones()
    .then((milestones) => {
      const loadedTimeline = _.omit(timeline.toJSON(), ['deletedAt', 'deletedBy']);
      loadedTimeline.milestones =
        _.map(milestones, milestone => _.omit(milestone.toJSON(), ['deletedAt', 'deletedBy']));

      return Promise.resolve(loadedTimeline);
    });

module.exports = [
  validate(schema),
  // Validate and get projectId from the timelineId param, and set to request params for
  // checking by the permissions middleware
  validateTimeline.validateTimelineIdParam,
  permissions('timeline.view'),
  (req, res, next) => {
    req.log.debug('loading timeline directly from database');
    return loadMilestones(req.timeline)
      .then(timeline => res.json(timeline))
      .catch(next);
  },
];
