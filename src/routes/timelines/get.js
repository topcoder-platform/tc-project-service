/**
 * API to get a timeline
 */
import validate from 'express-validation';
import Joi from 'joi';
import config from 'config';
import _ from 'lodash';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import util from '../../util';
import validateTimeline from '../../middlewares/validateTimeline';

const permissions = tcMiddleware.permissions;

const ES_TIMELINE_INDEX = config.get('elasticsearchConfig.timelineIndexName');
const ES_TIMELINE_TYPE = config.get('elasticsearchConfig.timelineDocType');

const eClient = util.getElasticSearchClient();

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
  permissions('timeline.view'),
  (req, res, next) => {
    eClient.get({ index: ES_TIMELINE_INDEX,
      type: ES_TIMELINE_TYPE,
      id: req.params.timelineId,
    })
    .then((doc) => {
      req.log.debug('timeline found in ES');
      res.json(doc._source);  // eslint-disable-line no-underscore-dangle
    })
    .catch((err) => {
      if (err.status === 404) {
        req.log.debug('No timeline found in ES');
        // Load the milestones
        return req.timeline.getMilestones()
          .then((milestones) => {
            const timeline = _.omit(req.timeline.toJSON(), ['deletedAt', 'deletedBy']);
            timeline.milestones =
              _.map(milestones, milestone => _.omit(milestone.toJSON(), ['deletedAt', 'deletedBy']));

            // Write to response
            return res.json(timeline);
          });
      }
      return next(err);
    });
  },
];
