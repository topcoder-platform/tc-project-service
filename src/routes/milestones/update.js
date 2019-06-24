/**
 * API to update a milestone
 */
import validate from 'express-validation';
import _ from 'lodash';
import moment from 'moment';
import Joi from 'joi';
import Sequelize from 'sequelize';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import util from '../../util';
import validateTimeline from '../../middlewares/validateTimeline';
import { EVENT, RESOURCES, MILESTONE_STATUS } from '../../constants';
import models from '../../models';

const permissions = tcMiddleware.permissions;

/**
 * Cascades endDate/completionDate changes to all milestones with a greater order than the given one.
 * @param {Object} origMilestone the original milestone that was updated
 * @param {Object} updMilestone the milestone that was updated
 * @returns {Promise<void>} a promise that resolves to the last found milestone. If no milestone exists with an
 * order greater than the passed <b>updMilestone</b>, the promise will resolve to the passed
 * <b>updMilestone</b>
 */
function updateComingMilestones(origMilestone, updMilestone) {
  // flag to indicate if the milestone in picture, is updated for completionDate field or not
  const completionDateChanged = !_.isEqual(origMilestone.completionDate, updMilestone.completionDate);
  const today = moment.utc().hours(0).minutes(0).seconds(0)
    .milliseconds(0);
  // updated milestone's start date, pefers actual start date over scheduled start date
  const updMSStartDate = updMilestone.actualStartDate ? updMilestone.actualStartDate : updMilestone.startDate;
  // calculates schedule end date for the milestone based on start date and duration
  let updMilestoneEndDate = moment.utc(updMSStartDate).add(updMilestone.duration - 1, 'days').toDate();
  // if the milestone, in context, is completed, overrides the end date to the completion date
  updMilestoneEndDate = updMilestone.completionDate ? updMilestone.completionDate : updMilestoneEndDate;
  let originalMilestones;
  return models.Milestone.findAll({
    where: {
      timelineId: updMilestone.timelineId,
      order: { $gt: updMilestone.order },
    },
  }).then((affectedMilestones) => {
    originalMilestones = affectedMilestones.map(am => _.omit(am.toJSON(), 'deletedAt', 'deletedBy'));
    const comingMilestones = _.sortBy(affectedMilestones, 'order');
    // calculates the schedule start date for the next milestone
    let startDate = moment.utc(updMilestoneEndDate).add(1, 'days').toDate();
    let firstMilestoneFound = false;
    const promises = _.map(comingMilestones, (_milestone) => {
      const milestone = _milestone;

      // Update the milestone startDate if different than the iterated startDate
      if (!_.isEqual(milestone.startDate, startDate)) {
        milestone.startDate = startDate;
        milestone.updatedBy = updMilestone.updatedBy;
      }

      // Calculate the endDate, and update it if different
      const endDate = moment.utc(milestone.startDate).add(milestone.duration - 1, 'days').toDate();
      if (!_.isEqual(milestone.endDate, endDate)) {
        milestone.endDate = endDate;
        milestone.updatedBy = updMilestone.updatedBy;
      }

      // if completionDate is alerted, update status of the first non hidden milestone after the current one
      if (!firstMilestoneFound && completionDateChanged && !milestone.hidden) {
        // activate next milestone
        milestone.status = MILESTONE_STATUS.ACTIVE;
        milestone.actualStartDate = today;
        firstMilestoneFound = true;
      }

      // if milestone is not hidden, update the startDate for the next milestone, otherwise keep the same startDate for next milestone
      if (!milestone.hidden) {
        // Set the next startDate value to the next day after completionDate if present or the endDate
        startDate = moment.utc(milestone.completionDate
          ? milestone.completionDate
          : milestone.endDate).add(1, 'days').toDate();
      }
      return milestone.save();
    });

    // Resolve promise with all original and updated milestones
    return Promise.all(promises).then(updatedMilestones => ({
      originalMilestones,
      updatedMilestones: updatedMilestones.map(um => _.omit(um.toJSON(), 'deletedAt', 'deletedBy')),
    }));
  });
}

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
  (req, res, next) => {
    const where = {
      timelineId: req.params.timelineId,
      id: req.params.milestoneId,
    };
    const entityToUpdate = _.assign(req.body, {
      updatedBy: req.authUser.userId,
      timelineId: req.params.timelineId,
    });

    const timeline = req.timeline;
    const originalTimeline = _.omit(timeline.toJSON(), 'deletedAt', 'deletedBy');

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

          if (entityToUpdate.completionDate && entityToUpdate.completionDate < milestone.startDate) {
            const apiErr = new Error('The milestone completionDate should be greater or equal than the startDate.');
            apiErr.status = 400;
            return Promise.reject(apiErr);
          }

          original = _.omit(milestone.toJSON(), ['deletedAt', 'deletedBy']);
          const durationChanged = entityToUpdate.duration && entityToUpdate.duration !== milestone.duration;
          const statusChanged = entityToUpdate.status && entityToUpdate.status !== milestone.status;
          const completionDateChanged = entityToUpdate.completionDate
            && !_.isEqual(milestone.completionDate, entityToUpdate.completionDate);
          const today = moment.utc().hours(0).minutes(0).seconds(0)
            .milliseconds(0);

          // Merge JSON fields
          entityToUpdate.details = util.mergeJsonObjects(milestone.details, entityToUpdate.details);

          let actualStartDateCanged = false;
          // if status has changed
          if (statusChanged) {
            // if status has changed to be completed, set the compeltionDate if not provided
            if (entityToUpdate.status === MILESTONE_STATUS.COMPLETED) {
              entityToUpdate.completionDate = entityToUpdate.completionDate ? entityToUpdate.completionDate : today;
              entityToUpdate.duration = entityToUpdate.completionDate.diff(entityToUpdate.actualStartDate, 'days') + 1;
            }
            // if status has changed to be active, set the startDate to today
            if (entityToUpdate.status === MILESTONE_STATUS.ACTIVE) {
              // NOTE: not updating startDate as activating a milestone should not update the scheduled start date
              // entityToUpdate.startDate = today;
              // should update actual start date
              entityToUpdate.actualStartDate = today;
              actualStartDateCanged = true;
            }
          }

          // Updates the end date of the milestone if:
          // 1. if duration of the milestone is udpated, update its end date
          // OR
          // 2. if actual start date is updated, updating the end date of the activated milestone because
          // early or late start of milestone, we are essentially changing the end schedule of the milestone
          if (durationChanged || actualStartDateCanged) {
            const updatedStartDate = actualStartDateCanged ? entityToUpdate.actualStartDate : milestone.startDate;
            const updatedDuration = _.get(entityToUpdate, 'duration', milestone.duration);
            entityToUpdate.endDate = moment.utc(updatedStartDate).add(updatedDuration - 1, 'days').toDate();
          }

          // if completionDate has changed
          if (!statusChanged && completionDateChanged) {
            entityToUpdate.duration = entityToUpdate.completionDate.diff(entityToUpdate.actualStartDate, 'days') + 1;
            entityToUpdate.status = MILESTONE_STATUS.COMPLETED;
          }

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
          // we need to recalculate change in fields because we update some fields before making actual update
          const needToCascade = !_.isEqual(original.completionDate, updated.completionDate) // completion date changed
            || original.duration !== updated.duration // duration changed
            || original.actualStartDate !== updated.actualStartDate; // actual start date updated
          req.log.debug('needToCascade', needToCascade);
          // Update dates of the other milestones only if cascade updates needed
          if (needToCascade) {
            return updateComingMilestones(original, updated)
              .then(({ originalMilestones, updatedMilestones }) => {
                // finds the last milestone updated
                // if no milestone is updated by updateComingMilestones method, it means the current milestone is the last one
                const lastTimelineMilestone = updatedMilestones.length ? _.last(updatedMilestones) : updated;
                if (!_.isEqual(lastTimelineMilestone.endDate, timeline.endDate)) {
                  timeline.endDate = lastTimelineMilestone.endDate;
                  timeline.updatedBy = lastTimelineMilestone.updatedBy;
                  return timeline.save().then(() => ({ originalMilestones, updatedMilestones }));
                }
                return Promise.resolve({ originalMilestones, updatedMilestones });
              });
          }
          return Promise.resolve({});
        }),
    )
    .then(({ originalMilestones, updatedMilestones }) => {
      const cascadedMilestones = _.map(originalMilestones, om => ({
        original: om, updated: _.find(updatedMilestones, um => um.id === om.id),
      }));
      const cascadedUpdates = { milestones: cascadedMilestones };
      // if there is a change in timeline, add it to the cascadedUpdates
      if (originalTimeline.updatedAt !== timeline.updatedAt) {
        cascadedUpdates.timeline = {
          original: originalTimeline,
          updated: _.omit(timeline.toJSON(), 'deletedAt', 'deletedBy'),
        };
      }
      // Send event to bus
      req.log.debug('Sending event to RabbitMQ bus for milestone %d', updated.id);
      req.app.services.pubsub.publish(EVENT.ROUTING_KEY.MILESTONE_UPDATED,
        { original, updated, cascadedUpdates },
        { correlationId: req.id },
      );

      // emit the event
      util.sendResourceToKafkaBus(
        req,
        EVENT.ROUTING_KEY.MILESTONE_UPDATED,
        RESOURCES.MILESTONE,
        _.assign(entityToUpdate, _.pick(updated, 'id', 'updatedAt')),
      );

      // Write to response
      res.json(updated);
      return Promise.resolve();
    })
    .catch(next);
  },
];
