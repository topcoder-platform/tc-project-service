/**
 * API to list all timelines
 */
import config from 'config';
import _ from 'lodash';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import util from '../../util';
import validateTimeline from '../../middlewares/validateTimeline';

const ES_TIMELINE_INDEX = config.get('elasticsearchConfig.timelineIndexName');
const ES_TIMELINE_TYPE = config.get('elasticsearchConfig.timelineDocType');

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

const permissions = tcMiddleware.permissions;

module.exports = [
  // Validate and get projectId from the reference/referenceId pair, and set to request params for
  // checking by the permissions middleware
  validateTimeline.validateTimelineQueryFilter,
  permissions('timeline.view'),
  (req, res, next) => {
    const filter = req.params.filter;

    // Build the elastic search query
    const esTerms = [{
      term: { reference: filter.reference },
    }, {
      term: { referenceId: filter.referenceId },
    }];

    // Retrieve timelines, as we know the user has access for the provided reference/referenceId part
    return retrieveTimelines(esTerms)
      .then(result => res.json(util.wrapResponse(req.id, result.rows, result.count)))
      .catch(err => next(err));
  },
];
