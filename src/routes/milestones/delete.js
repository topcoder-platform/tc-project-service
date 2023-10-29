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
import { deleteMilestone } from './commonHelper';

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
  (req, res, next) =>
    models
      .sequelize
      .transaction(t => deleteMilestone(req.authUser, req.params.timelineId, req.params.milestoneId, t))
      .then((deleted) => {
        util.sendResourceToKafkaBus(
          req,
          EVENT.ROUTING_KEY.MILESTONE_REMOVED,
          RESOURCES.MILESTONE,
          deleted);
        res.status(204).end();
      })
      .catch(next),
];
