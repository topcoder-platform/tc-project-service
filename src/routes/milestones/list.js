/**
 * API to list all milestones
 */
import validate from 'express-validation';
import Joi from 'joi';
import _ from 'lodash';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import validateTimeline from '../../middlewares/validateTimeline';

const permissions = tcMiddleware.permissions;

const schema = {
  params: {
    timelineId: Joi.number().integer().positive().required(),
  },
};

module.exports = [
  validate(schema),
  // Validate and get projectId from the timelineId param, and set to request params for
  // checking by the permissions middleware
  validateTimeline.validateTimelineIdParam,
  permissions('milestone.view'),
  (req, res, next) => {
    // Parse the sort query
    let sort = req.query.sort ? decodeURIComponent(req.query.sort) : 'order';
    if (sort && sort.indexOf(' ') === -1) {
      sort += ' asc';
    }
    const sortableProps = [
      'order asc', 'order desc',
    ];
    if (sort && _.indexOf(sortableProps, sort) < 0) {
      const apiErr = new Error('Invalid sort criteria');
      apiErr.status = 400;
      return next(apiErr);
    }
    const sortColumnAndOrder = sort.split(' ');
    const sortDirection = sortColumnAndOrder[1].toUpperCase();

    return req.timeline.getMilestones({
      order: [[sortColumnAndOrder[0], sortDirection]],
    })
      .then(milestones =>
        res.json(_.map(milestones, milestone => _.omit(milestone.toJSON(), ['deletedAt', 'deletedBy']))),
      )
      .catch(next);
  },
];
