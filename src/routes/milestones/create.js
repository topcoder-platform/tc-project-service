/**
 * API to add a milestone
 */
import validate from 'express-validation';
import _ from 'lodash';
import Joi from 'joi';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import Sequelize from 'sequelize';
import util from '../../util';
import models from '../../models';
import { EVENT } from '../../constants';

const permissions = tcMiddleware.permissions;

const schema = {
  params: {
    timelineId: Joi.number().integer().positive().required(),
  },
  body: {
    param: Joi.object().keys({
      id: Joi.any().strip(),
      name: Joi.string().max(255).required(),
      description: Joi.string().max(255),
      duration: Joi.number().integer().required(),
      startDate: Joi.date().required(),
      endDate: Joi.date().min(Joi.ref('startDate')).allow(null),
      completionDate: Joi.date().min(Joi.ref('startDate')).allow(null),
      status: Joi.string().max(45).required(),
      type: Joi.string().max(45).required(),
      details: Joi.object(),
      order: Joi.number().integer().required(),
      plannedText: Joi.string().max(512).required(),
      activeText: Joi.string().max(512).required(),
      completedText: Joi.string().max(512).required(),
      blockedText: Joi.string().max(512).required(),
      createdAt: Joi.any().strip(),
      updatedAt: Joi.any().strip(),
      deletedAt: Joi.any().strip(),
      createdBy: Joi.any().strip(),
      updatedBy: Joi.any().strip(),
      deletedBy: Joi.any().strip(),
    }).required(),
  },
};

module.exports = [
  validate(schema),
  // Validate and get projectId from the timelineId param, and set to request params
  // for checking by the permissions middleware
  util.validateTimelineIdParam,
  permissions('milestone.create'),
  (req, res, next) => {
    const entity = _.assign(req.body.param, {
      createdBy: req.authUser.userId,
      updatedBy: req.authUser.userId,
      timelineId: req.params.timelineId,
    });
    let result;

    // Validate startDate and endDate to be within the timeline startDate and endDate
    let error;
    if (req.body.param.startDate < req.timeline.startDate) {
      error = 'Milestone startDate must not be before the timeline startDate';
    } else if (req.body.param.endDate && req.timeline.endDate && req.body.param.endDate > req.timeline.endDate) {
      error = 'Milestone endDate must not be after the timeline endDate';
    }
    if (error) {
      const apiErr = new Error(error);
      apiErr.status = 422;
      return next(apiErr);
    }

    return models.sequelize.transaction(tx =>
      // Save to DB
      models.Milestone.create(entity, { transaction: tx })
        .then((createdEntity) => {
          // Omit deletedAt, deletedBy
          result = _.omit(createdEntity.toJSON(), 'deletedAt', 'deletedBy');

          // Send event to bus
          req.log.debug('Sending event to RabbitMQ bus for milestone %d', result.id);
          req.app.services.pubsub.publish(EVENT.ROUTING_KEY.MILESTONE_ADDED,
            result,
            { correlationId: req.id },
          );

          // Increase the order of the other milestones in the same timeline,
          // which have `order` >= this milestone order
          return models.Milestone.update({ order: Sequelize.literal('"order" + 1') }, {
            where: {
              timelineId: result.timelineId,
              id: { $ne: result.id },
              order: { $gte: result.order },
            },
            transaction: tx,
          });
        })
        .then(() => {
          // Do not send events for the updated milestones here,
          // because it will make 'version conflict' error in ES.
          // The order of the other milestones need to be updated in the MILESTONE_ADDED event handler

          // Write to the response
          res.status(201).json(util.wrapResponse(req.id, result, 1, 201));
          return Promise.resolve();
        })
        .catch(next),
    );
  },
];
