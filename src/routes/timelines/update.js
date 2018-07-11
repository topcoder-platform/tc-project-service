/**
 * API to update a timeline
 */
import validate from 'express-validation';
import _ from 'lodash';
import Joi from 'joi';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import util from '../../util';
import { EVENT, TIMELINE_REFERENCES } from '../../constants';

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
  },
};

module.exports = [
  validate(schema),
  // Validate and get projectId from the timelineId param and request body,
  // and set to request params for checking by the permissions middleware
  util.validateTimelineIdParam,
  util.validateTimelineRequestBody,
  permissions('timeline.edit'),
  (req, res, next) => {
    const entityToUpdate = _.assign(req.body.param, {
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

        // Update milestones startDate and endDate if necessary
        if (original.startDate !== updated.startDate || original.endDate !== updated.endDate) {
          return updatedTimeline.getMilestones()
            .then((milestones) => {
              const updateMilestonePromises = _.map(milestones, (_milestone) => {
                const milestone = _milestone;
                if (original.startDate !== updated.startDate) {
                  if (milestone.startDate && milestone.startDate < updated.startDate) {
                    milestone.startDate = updated.startDate;
                    if (milestone.endDate && milestone.endDate < milestone.startDate) {
                      milestone.endDate = milestone.startDate;
                    }
                    milestone.updatedBy = req.authUser.userId;
                  }
                }

                if (original.endDate !== updated.endDate) {
                  if (milestone.endDate && updated.endDate && updated.endDate < milestone.endDate) {
                    milestone.endDate = updated.endDate;
                    milestone.updatedBy = req.authUser.userId;
                  }
                }

                return milestone.save();
              });

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
        // Send event to bus
        req.log.debug('Sending event to RabbitMQ bus for timeline %d', updated.id);
        req.app.services.pubsub.publish(EVENT.ROUTING_KEY.TIMELINE_UPDATED,
          { original, updated },
          { correlationId: req.id },
        );

        // Write to response
        res.json(util.wrapResponse(req.id, updated));
        return Promise.resolve();
      })
      .catch(next);
  },
];
