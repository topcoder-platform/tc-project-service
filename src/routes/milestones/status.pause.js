import validate from 'express-validation';
import _ from 'lodash';
import Joi from 'joi';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import util from '../../util';
import validateTimeline from '../../middlewares/validateTimeline';
import { MILESTONE_STATUS, EVENT } from '../../constants';
import models from '../../models';

const permissions = tcMiddleware.permissions;

const schema = {
  params: {
    timelineId: Joi.number().integer().positive().required(),
    milestoneId: Joi.number().integer().positive().required(),
  },
  body: {
    param: Joi.object().keys({
      comment: Joi.string().max(512).required(),
    }).required(),
  },
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

    const entityToUpdate = {
      updatedBy: req.authUser.userId,
    };
    const comment = req.body.param.comment;

    let original;
    let updated;

    return models.sequelize.transaction(transaction =>
      // Find the milestone
      models.Milestone.findOne({ where })
        .then((milestone) => {
          // Not found
          if (!milestone) {
            const apiErr = new Error(`Milestone not found for milestone id ${req.params.milestoneId}`);
            apiErr.status = 404;
            return Promise.reject(apiErr);
          }

          // status already on pause
          if (milestone.status === MILESTONE_STATUS.PAUSED) {
            const apiErr = new Error('Milestone status already paused');
            apiErr.status = 422;
            return Promise.reject(apiErr);
          }

          original = _.omit(milestone.toJSON(), ['deletedAt', 'deletedBy']);

          entityToUpdate.status = MILESTONE_STATUS.PAUSED;
          entityToUpdate.id = milestone.id;

          // Update
          return milestone.update(entityToUpdate, { comment, transaction });
        })
        .then((updatedMilestone) => {
          updated = _.omit(updatedMilestone.toJSON(), 'deletedAt', 'deletedBy');
        }),
    )
      .then(() => {
        // Send event to bus
        req.log.debug('Sending event to RabbitMQ bus for milestone %d', updated.id);
        req.app.services.pubsub.publish(EVENT.ROUTING_KEY.MILESTONE_PAUSED,
          { original, updated },
          { correlationId: req.id },
        );

        req.app.emit(EVENT.ROUTING_KEY.MILESTONE_PAUSED,
          { req, original, updated });

        res.json(util.wrapResponse(req.id));
        return Promise.resolve(true);
      })
      .catch(next);
  },
];
