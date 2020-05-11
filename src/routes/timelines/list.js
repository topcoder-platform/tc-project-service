/**
 * API to list all timelines
 */
import config from 'config';
import _ from 'lodash';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import models from '../../models';
import util from '../../util';
import validateTimeline from '../../middlewares/validateTimeline';

const ES_TIMELINE_INDEX = config.get('elasticsearchConfig.timelineIndexName');
const ES_TIMELINE_TYPE = config.get('elasticsearchConfig.timelineDocType');

const MILESTONE_ATTRIBUTES = _.without(
  _.keys(models.Milestone.rawAttributes),
  'deletedAt',
);

/**
 * Retrieve timelines from elastic search.
 * @param {Array} esTerms the elastic search terms
 * @returns {Promise} the promise resolves to the results
 */
function retrieveTimelines(esTerms) {
  return new Promise((accept, reject) => {
    const es = util.getElasticSearchClient();
    es.search({
      index: ES_TIMELINE_INDEX,
      type: ES_TIMELINE_TYPE,
      body: {
        query: { bool: { must: esTerms } },
      },
    }).then((docs) => {
      const rows = _.map(docs.hits.hits, single => _.omit(single._source, ['projectId'])); // eslint-disable-line no-underscore-dangle
      accept({ rows, count: docs.hits.total });
    }).catch(reject);
  });
}

/**
 * Retrieve timelines from database.
 * @param {Object} req the req object
 * @param {Object} filters the filter object
 * @returns {Array} the timelines
 */
function retrieveTimelinesFromDB(req, filters) {
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

    // Build the elastic search query
    const esTerms = [{
      term: { reference: filter.reference },
    }, {
      term: { referenceId: filter.referenceId },
    }];

    // Retrieve timelines, as we know the user has access for the provided reference/referenceId part
    return retrieveTimelines(esTerms)
      .then((result) => {
        if (result.rows.length === 0) {
          req.log.debug('Fetch timeline from db');
          return retrieveTimelinesFromDB(req, filter)
            .then(timelines => res.json(timelines));
        }
        req.log.debug('timeline found from ES');
        return res.json(result.rows);
      })
      .catch(err => next(err));
  },
];
