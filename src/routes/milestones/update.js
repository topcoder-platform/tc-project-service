/**
 * API to update a milestone
 */
import validate from 'express-validation';
import _ from 'lodash';
import Joi from 'joi';
import Sequelize from 'sequelize';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import util from '../../util';
import { EVENT } from '../../constants';
import models from '../../models';

const permissions = tcMiddleware.permissions;

const schema = {
  params: {
    timelineId: Joi.number().integer().positive().required(),
    milestoneId: Joi.number().integer().positive().required(),
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
  // Validate and get projectId from the timelineId param,
  // and set to request params for checking by the permissions middleware
  util.validateTimelineIdParam,
  permissions('milestone.edit'),
  (req, res, next) => {
    const where = {
      timelineId: req.params.timelineId,
      id: req.params.milestoneId,
    };
    const entityToUpdate = _.assign(req.body.param, {
      updatedBy: req.authUser.userId,
      timelineId: req.params.timelineId,
    });

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

    let original;
    let updated;

    return models.sequelize.transaction(() =>
      // Find the milestone
      models.Milestone.findOne({ where })
        .then((milestone) => {
          // Not found
          if (!milestone) {
            const apiErr = new Error(`Milestone not found for milestone id ${req.params.milestoneId}`);
            apiErr.status = 404;
            return Promise.reject(apiErr);
          }

          original = _.omit(milestone.toJSON(), ['deletedAt', 'deletedBy']);

          // Merge JSON fields
          entityToUpdate.details = util.mergeJsonObjects(milestone.details, entityToUpdate.details);

          // Update
          return milestone.update(entityToUpdate);
        })
        .then((updatedMilestone) => {
          // Omit deletedAt, deletedBy
          updated = _.omit(updatedMilestone.toJSON(), 'deletedAt', 'deletedBy');

          // Update order of the other milestones only if the order was changed
          if (original.order === updated.order) {
            return Promise.resolve();
          }

          return models.Milestone.count({
            where: {
              timelineId: updated.timelineId,
              id: { $ne: updated.id },
              order: updated.order,
            },
          })
            .then((count) => {
              if (count === 0) {
                return Promise.resolve();
              }

              // Increase the order from M to K: if there is an item with order K,
              // orders from M+1 to K should be made M to K-1
              if (original.order < updated.order) {
                return models.Milestone.update({ order: Sequelize.literal('"order" - 1') }, {
                  where: {
                    timelineId: updated.timelineId,
                    id: { $ne: updated.id },
                    order: { $between: [original.order + 1, updated.order] },
                  },
                });
              }

              // Decrease the order from M to K: if there is an item with order K,
              // orders from K to M-1 should be made K+1 to M
              return models.Milestone.update({ order: Sequelize.literal('"order" + 1') }, {
                where: {
                  timelineId: updated.timelineId,
                  id: { $ne: updated.id },
                  order: { $between: [updated.order, original.order - 1] },
                },
              });
            });
        })
        .then(() => {
          // Send event to bus
          req.log.debug('Sending event to RabbitMQ bus for milestone %d', updated.id);
          req.app.services.pubsub.publish(EVENT.ROUTING_KEY.MILESTONE_UPDATED,
            { original, updated },
            { correlationId: req.id },
          );

          // Do not send events for the the other milestones (updated order) here,
          // because it will make 'version conflict' error in ES.
          // The order of the other milestones need to be updated in the MILESTONE_UPDATED event above

          // Write to response
          res.json(util.wrapResponse(req.id, updated));
          return Promise.resolve();
        })
        .catch(next),
    );
  },
];
