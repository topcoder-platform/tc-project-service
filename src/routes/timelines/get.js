/**
 * API to get a timeline
 */
import validate from 'express-validation';
import Joi from 'joi';
import _ from 'lodash';
import { middleware as tcMiddleware } from 'tc-core-library-js';
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
  permissions('timeline.view'),
  (req, res) => {
    // Load the milestones
    req.timeline.getMilestones()
      .then((milestones) => {
        const timeline = _.omit(req.timeline.toJSON(), ['deletedAt', 'deletedBy']);
        timeline.milestones =
          _.map(milestones, milestone => _.omit(milestone.toJSON(), ['deletedAt', 'deletedBy']));

        // Write to response
        res.json(util.wrapResponse(req.id, timeline));
      });
  },
];
