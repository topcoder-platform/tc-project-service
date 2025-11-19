/**
 * API to list all timelines
 */
import _ from 'lodash';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import models from '../../models';
import validateTimeline from '../../middlewares/validateTimeline';

const MILESTONE_ATTRIBUTES = _.without(
  _.keys(models.Milestone.rawAttributes),
  'deletedAt',
);

/**
 * Retrieve timelines from database.
 * @param {Object} req the req object
 * @param {Object} filters the filter object
 * @returns {Array} the timelines
 */
function retrieveTimelines(req, filters) {
  return models.Timeline.search(filters, req.log)
    .then((timelines) => {
      const timelineIds = _.map(timelines, 'id');

      // retrieve milestones
      return models.Milestone.findAll({
        attributes: MILESTONE_ATTRIBUTES,
        where: { timelineId: { $in: timelineIds } },
        raw: true,
      })
        .then((values) => {
          _.forEach(timelines, (t) => {
            t.milestones = _.filter(values, m => m.timelineId === t.id); // eslint-disable-line no-param-reassign
          });
          return timelines;
        });
    });
}

const permissions = tcMiddleware.permissions;

module.exports = [
  // Validate and get projectId from the reference/referenceId pair, and set to request query for
  // checking by the permissions middleware
  validateTimeline.validateTimelineQueryFilter,
  permissions('timeline.view'),
  (req, res, next) => {
    const filter = req.query;

    return retrieveTimelines(req, filter)
      .then(timelines => res.json(timelines))
      .catch(next);
  },
];
