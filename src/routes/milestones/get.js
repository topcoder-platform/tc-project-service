/**
 * API to get a milestone
 */
import validate from 'express-validation';
import Joi from 'joi';
import _ from 'lodash';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import util from '../../util';
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
  util.validateTimelineIdParam,
  permissions('milestone.view'),
  (req, res, next) => {
    const where = {
      timelineId: req.params.timelineId,
      id: req.params.milestoneId,
    };

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
        res.json(util.wrapResponse(req.id, _.omit(milestone.toJSON(), ['deletedBy', 'deletedAt'])));
        return Promise.resolve();
      })
      .catch(next);
  },
];
