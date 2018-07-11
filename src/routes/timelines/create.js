/**
 * API to add a timeline
 */
import validate from 'express-validation';
import _ from 'lodash';
import Joi from 'joi';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import util from '../../util';
import models from '../../models';
import { EVENT, TIMELINE_REFERENCES } from '../../constants';

const permissions = tcMiddleware.permissions;

const schema = {
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
  // Validate and get projectId from the timeline request body, and set to request params
  // for checking by the permissions middleware
  util.validateTimelineRequestBody,
  permissions('timeline.create'),
  (req, res, next) => {
    const entity = _.assign(req.body.param, {
      createdBy: req.authUser.userId,
      updatedBy: req.authUser.userId,
    });

    // Save to DB
    return models.Timeline.create(entity)
      .then((createdEntity) => {
        // Omit deletedAt, deletedBy
        const result = _.omit(createdEntity.toJSON(), 'deletedAt', 'deletedBy');

        // Send event to bus
        req.log.debug('Sending event to RabbitMQ bus for timeline %d', result.id);
        req.app.services.pubsub.publish(EVENT.ROUTING_KEY.TIMELINE_ADDED,
          _.assign({ projectId: req.params.projectId }, result),
          { correlationId: req.id },
        );

        // Write to the response
        res.status(201).json(util.wrapResponse(req.id, result, 1, 201));
        return Promise.resolve();
      })
      .catch(next);
  },
];
