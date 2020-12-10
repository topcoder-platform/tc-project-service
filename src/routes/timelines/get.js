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
  query: {
    db: Joi.boolean().optional(),
  },
};

// Load the milestones
const loadMilestones = timeline =>
  timeline.getMilestones()
    .then((milestones) => {
      const loadedTimeline = _.omit(timeline.toJSON(), ['deletedAt', 'deletedBy']);
      loadedTimeline.milestones =
        _.map(milestones, milestone => _.omit(milestone.toJSON(), ['deletedAt', 'deletedBy']));

      return Promise.resolve(loadedTimeline);
    });

module.exports = [
  validate(schema),
  // Validate and get projectId from the timelineId param, and set to request params for
  // checking by the permissions middleware
  validateTimeline.validateTimelineIdParam,
  permissions('timeline.view'),
  (req, res, next) => {
    // when user query with db, bypass the elasticsearch
    // and get the data directly from database
    if (req.query.db) {
      req.log.debug('bypass ES, gets timeline directly from database');
      return loadMilestones(req.timeline).then(timeline => res.json(timeline));
    }
    return eClient.get({ index: ES_TIMELINE_INDEX,
      type: ES_TIMELINE_TYPE,
      id: req.params.timelineId,
    })
      .then((doc) => {
        req.log.debug('timeline found in ES');
        return res.json(doc._source); // eslint-disable-line no-underscore-dangle
      })
      .catch((err) => {
        if (err.status === 404) {
          req.log.debug('No timeline found in ES');
          return loadMilestones(req.timeline).then(timeline => res.json(timeline));
        }
        return next(err);
      });
  },
];
