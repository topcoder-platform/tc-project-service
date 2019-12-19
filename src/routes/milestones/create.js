/**
 * API to add a milestone
 */
import validate from 'express-validation';
import _ from 'lodash';
import Joi from 'joi';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import Sequelize from 'sequelize';
import util from '../../util';
import validateTimeline from '../../middlewares/validateTimeline';
import models from '../../models';
import { EVENT, RESOURCES } from '../../constants';

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
    completionDate: Joi.date().min(Joi.ref('startDate')).allow(null),
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
  (req, res, next) => {
    const entity = _.assign(req.body, {
      createdBy: req.authUser.userId,
      updatedBy: req.authUser.userId,
      timelineId: req.params.timelineId,
    });
    let result;

    // Validate startDate is not earlier than timeline startDate
    let error;
    if (req.body.startDate < req.timeline.startDate) {
      error = 'Milestone startDate must not be before the timeline startDate';
    }
    if (error) {
      const apiErr = new Error(error);
      apiErr.status = 400;
      return next(apiErr);
    }

    return models.sequelize.transaction(() =>
      // Save to DB
      models.Milestone.create(entity)
        .then((createdEntity) => {
          // Omit deletedAt, deletedBy
          result = _.omit(createdEntity.toJSON(), 'deletedAt', 'deletedBy');

          // Increase the order of the other milestones in the same timeline,
          // which have `order` >= this milestone order
          return models.Milestone.update({ order: Sequelize.literal('"order" + 1') }, {
            where: {
              timelineId: result.timelineId,
              id: { $ne: result.id },
              order: { $gte: result.order },
            },
          });
        })
        .then((updatedCount) => {
          if (updatedCount) {
            return models.Milestone.findAll({
              where: {
                timelineId: result.timelineId,
                id: { $ne: result.id },
                order: { $gte: result.order + 1 },
              },
              order: [['updatedAt', 'DESC']],
              limit: updatedCount[0],
            });
          }
          return Promise.resolve();
        }),
    )
    .then((otherUpdated) => {
      // Send event to bus
      req.log.debug('Sending event to RabbitMQ bus for milestone %d', result.id);
      req.app.services.pubsub.publish(EVENT.ROUTING_KEY.MILESTONE_ADDED,
        result,
        { correlationId: req.id },
      );

      // NOTE So far this logic is implemented in RabbitMQ handler of MILESTONE_ADDED
      //      Even though we send this event to the Kafka, the "project-processor-es" shouldn't process it.
      util.sendResourceToKafkaBus(
        req,
        EVENT.ROUTING_KEY.MILESTONE_ADDED,
        RESOURCES.MILESTONE,
        result);

      // NOTE So far this logic is implemented in RabbitMQ handler of MILESTONE_ADDED
      //      Even though we send these events to the Kafka, the "project-processor-es" shouldn't process them.
      //
      //      We don't process these event in "project-processor-es"
      //      because it will make 'version conflict' error in ES.
      //      The order of the other milestones need to be updated in the PROJECT_PHASE_UPDATED event handler
      _.map(otherUpdated, milestone =>
        util.sendResourceToKafkaBus(
          req,
          EVENT.ROUTING_KEY.MILESTONE_UPDATED,
          RESOURCES.MILESTONE,
          _.assign(_.pick(milestone.toJSON(), 'id', 'order', 'updatedBy', 'updatedAt')),
          // Pass the same object as original milestone even though, their time has changed.
          // So far we don't use time properties in the handler so it's ok. But in general, we should pass
          // the original milestones. <- TODO
          _.assign(_.pick(milestone.toJSON(), 'id', 'order', 'updatedBy', 'updatedAt')),
          null, // no route
          true, // don't send event to Notification Service as the main event here is updating one milestone
        ),
      );

      // Write to the response
      res.status(201).json(result);
      return Promise.resolve();
    })
    .catch(next);
  },
];
