/**
 * API to update a milestone
 */
import validate from 'express-validation';
import Joi from 'joi';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import util from '../../util';
import validateTimeline from '../../middlewares/validateTimeline';
import { EVENT, RESOURCES } from '../../constants';
import models from '../../models';
import { updateMilestone } from './commonHelper';

const permissions = tcMiddleware.permissions;

const schema = {
  params: {
    timelineId: Joi.number().integer().positive().required(),
    milestoneId: Joi.number().integer().positive().required(),
  },
  body: Joi.object().keys({
    id: Joi.any().strip(),
    name: Joi.string().max(255).optional(),
    description: Joi.string().max(255),
    duration: Joi.number().integer().min(1).optional(),
    startDate: Joi.any().forbidden(),
    actualStartDate: Joi.date().allow(null),
    endDate: Joi.any().forbidden(),
    completionDate: Joi.date().allow(null),
    status: Joi.string().max(45).optional(),
    type: Joi.string().max(45).optional(),
    details: Joi.object(),
    order: Joi.number().integer().optional(),
    plannedText: Joi.string().max(512).optional(),
    activeText: Joi.string().max(512).optional(),
    completedText: Joi.string().max(512).optional(),
    blockedText: Joi.string().max(512).optional(),
    hidden: Joi.boolean().optional(),
    statusComment: Joi.string().when('status', { is: 'paused', then: Joi.required(), otherwise: Joi.optional() }),
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
  // Validate and get projectId from the timelineId param,
  // and set to request params for checking by the permissions middleware
  validateTimeline.validateTimelineIdParam,
  permissions('milestone.edit'),
  (req, res, next) =>
    models
      .sequelize
      .transaction(t => updateMilestone(
        req.authUser,
        req.params.timelineId,
        Object.assign({}, req.body, { id: req.params.milestoneId }),
        t))
      .then(({ updated, original }) => {
        util.sendResourceToKafkaBus(
          req,
          EVENT.ROUTING_KEY.MILESTONE_UPDATED,
          RESOURCES.MILESTONE,
          updated,
          original,
        );
        res.json(updated);
      })
      .catch(next),
];
