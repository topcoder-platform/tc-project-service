/**
 * API to add a milestone
 */
import validate from 'express-validation';
import Joi from 'joi';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import util from '../../util';
import validateTimeline from '../../middlewares/validateTimeline';
import models from '../../models';
import { EVENT, RESOURCES } from '../../constants';
import { createMilestone } from './commonHelper';

const permissions = tcMiddleware.permissions;

const schema = {
  params: {
    timelineId: Joi.number().integer().positive().required(),
  },
  body: Joi.object().keys({
    id: Joi.any().strip(),
    name: Joi.string().max(255).required(),
    description: Joi.string().max(255),
    duration: Joi.number().integer().required(),
    startDate: Joi.date().required(),
    actualStartDate: Joi.date().allow(null),
    endDate: Joi.date().min(Joi.ref('startDate')).allow(null),
    completionDate: Joi.date().allow(null),
    status: Joi.string().max(45).required(),
    type: Joi.string().max(45).required(),
    details: Joi.object(),
    order: Joi.number().integer().required(),
    plannedText: Joi.string().max(512),
    activeText: Joi.string().max(512),
    completedText: Joi.string().max(512),
    blockedText: Joi.string().max(512),
    hidden: Joi.boolean().optional(),
    createdAt: Joi.any().strip(),
    updatedAt: Joi.any().strip(),
    deletedAt: Joi.any().strip(),
    createdBy: Joi.any().strip(),
    updatedBy: Joi.any().strip(),
    deletedBy: Joi.any().strip(),
  }).required(),
};

module.exports = [
  validate(schema),
  // Validate and get projectId from the timelineId param, and set to request params
  // for checking by the permissions middleware
  validateTimeline.validateTimelineIdParam,
  permissions('milestone.create'),
  (req, res, next) =>
    models.sequelize.transaction(t => createMilestone(req.authUser, req.timeline, req.body, t))
      .then((result) => {
        util.sendResourceToKafkaBus(
          req,
          EVENT.ROUTING_KEY.MILESTONE_ADDED,
          RESOURCES.MILESTONE,
          result);
        res.status(201).json(result);
      })
      .catch(next),
];
