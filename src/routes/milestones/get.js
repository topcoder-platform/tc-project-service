/**
 * API to get a milestone
 */
import validate from 'express-validation';
import Joi from 'joi';
import _ from 'lodash';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import util from '../../util';
import validateTimeline from '../../middlewares/validateTimeline';
import models from '../../models';

const permissions = tcMiddleware.permissions;

const schema = {
  params: {
    timelineId: Joi.number().integer().positive().required(),
    milestoneId: Joi.number().integer().positive().required(),
  },
};

module.exports = [
  validate(schema),
  // Validate and get projectId from the timelineId param, and set to request params for
  // checking by the permissions middleware
  validateTimeline.validateTimelineIdParam,
  permissions('milestone.view'),
  (req, res, next) => {
    const where = {
      timelineId: req.params.timelineId,
      id: req.params.milestoneId,
    };

    util.fetchByIdFromES('milestones', {
      query: {
        nested: {
          path: 'milestones',
          query: {
            match: { 'milestones.id': req.params.milestoneId },
          },
          inner_hits: {},
        },
      },
    }, 'timeline')
      .then((data) => {
        if (data.length === 0) {
          req.log.debug('No milestone found in ES');
          // Find the milestone
          models.Milestone.findOne({ where })
            .then((milestone) => {
            // Not found
              if (!milestone) {
                const apiErr = new Error(`Milestone not found for milestone id ${req.params.milestoneId}`);
                apiErr.status = 404;
                return Promise.reject(apiErr);
              }

              // Write to response
              res.json(_.omit(milestone.toJSON(), ['deletedBy', 'deletedAt']));
              return Promise.resolve();
            })
            .catch(next);
        } else {
          req.log.debug('milestone found in ES');
          res.json(data[0].inner_hits.milestones.hits.hits[0]._source); // eslint-disable-line no-underscore-dangle
        }
      })
      .catch(next);
  },
];
