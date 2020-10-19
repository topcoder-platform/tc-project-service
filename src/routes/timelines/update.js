/**
 * API to update a timeline
 */
import validate from 'express-validation';
import _ from 'lodash';
import moment from 'moment';
import Joi from 'joi';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import util from '../../util';
import validateTimeline from '../../middlewares/validateTimeline';
import { EVENT, RESOURCES, TIMELINE_REFERENCES } from '../../constants';

const permissions = tcMiddleware.permissions;

const schema = {
  params: {
    timelineId: Joi.number().integer().positive().required(),
  },
  body: Joi.object().keys({
    id: Joi.any().strip(),
    name: Joi.string().max(255).required(),
    description: Joi.string().max(255),
    startDate: Joi.date().required(),
    endDate: Joi.date().min(Joi.ref('startDate')).allow(null),
    reference: Joi.string().valid(_.values(TIMELINE_REFERENCES)).required(),
    referenceId: Joi.number().integer().positive().required(),
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
  // Validate and get projectId from the timelineId param and request body,
  // and set to request params for checking by the permissions middleware
  validateTimeline.validateTimelineIdParam,
  validateTimeline.validateTimelineRequestBody,
  permissions('timeline.edit'),
  (req, res, next) => {
    const entityToUpdate = _.assign(req.body, {
      updatedBy: req.authUser.userId,
    });

    const timeline = req.timeline;
    const original = _.omit(timeline.toJSON(), ['deletedAt', 'deletedBy']);
    let updated;

    // Update
    return timeline.update(entityToUpdate)
      .then((updatedTimeline) => {
        // Omit deletedAt, deletedBy
        updated = _.omit(updatedTimeline.toJSON(), ['deletedAt', 'deletedBy']);

        // Update milestones startDate and endDate if necessary, if the timeline startDate changed
        if (original.startDate.getTime() !== updated.startDate.getTime()) {
          return updatedTimeline.getMilestones()
            .then((milestones) => {
              let startDate = updated.startDate;

              // Process milestones in order
              const updateMilestonePromises = _.chain(milestones).sortBy('order').map((_milestone) => {
                const milestone = _milestone;

                // Update if the iterating startDate is different than the saved one
                if (milestone.startDate.getTime() !== startDate.getTime()) {
                  milestone.startDate = startDate;
                  milestone.updatedBy = req.authUser.userId;
                }

                // Make sure the endDate is the correct, i.e. for duration = 1 it should be equal to the start date,
                // for duration = 2 it should be equal to the next day and so on...
                const endDate = moment.utc(milestone.startDate).add(milestone.duration - 1, 'days').toDate();
                if (!milestone.endDate || endDate.getTime() !== milestone.endDate.getTime()) {
                  milestone.endDate = endDate;
                  milestone.updatedBy = req.authUser.userId;
                }

                // Next iterated milestone should have as startDate this milestone's endDate plus one day
                startDate = moment.utc(milestone.endDate).add(1, 'days').toDate();
                return milestone.save();
              }).value();

              return Promise.all(updateMilestonePromises)
                .then((updatedMilestones) => {
                  updated.milestones =
                    _.map(updatedMilestones, milestone => _.omit(milestone.toJSON(), ['deletedAt', 'deletedBy']));
                  return Promise.resolve();
                });
            });
        }

        return Promise.resolve();
      })
      .then(() => {
        // emit the event
        util.sendResourceToKafkaBus(
          req,
          EVENT.ROUTING_KEY.TIMELINE_UPDATED,
          RESOURCES.TIMELINE,
          updated,
          original);

        // Write to response
        res.json(updated);
        return Promise.resolve();
      })
      .catch(next);
  },
];
