/**
 * API to list all timelines
 */
import config from 'config';
import _ from 'lodash';
import util from '../../util';
import models from '../../models';
import { USER_ROLE, TIMELINE_REFERENCES } from '../../constants';

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


module.exports = [
  (req, res, next) => {
    // Validate the filter
    const filter = util.parseQueryFilter(req.query.filter);
    if (!util.isValidFilter(filter, ['reference', 'referenceId'])) {
      const apiErr = new Error('Only allowed to filter by reference and referenceId');
      apiErr.status = 422;
      return next(apiErr);
    }

    // Build the elastic search query
    const esTerms = [];
    if (filter.reference) {
      if (!_.includes(TIMELINE_REFERENCES, filter.reference)) {
        const apiErr = new Error(`reference filter must be in ${TIMELINE_REFERENCES}`);
        apiErr.status = 422;
        return next(apiErr);
      }

      esTerms.push({
        term: { reference: filter.reference },
      });
    }
    if (filter.referenceId) {
      if (_.lt(filter.referenceId, 1)) {
        const apiErr = new Error('referenceId filter must be a positive integer');
        apiErr.status = 422;
        return next(apiErr);
      }

      esTerms.push({
        term: { referenceId: filter.referenceId },
      });
    }

    // Admin and topcoder manager can see all timelines
    if (util.hasAdminRole(req) || util.hasRole(req, USER_ROLE.MANAGER)) {
      return retrieveTimelines(esTerms)
        .then(result => res.json(util.wrapResponse(req.id, result.rows, result.count)))
        .catch(err => next(err));
    }

    // Get project ids for copilot or member
    const getProjectIds = util.hasRole(req, USER_ROLE.COPILOT) ?
      models.Project.getProjectIdsForCopilot(req.authUser.userId) :
      models.ProjectMember.getProjectIdsForUser(req.authUser.userId);

    return getProjectIds
      .then((accessibleProjectIds) => {
        // Copilot or member can see his projects
        esTerms.push({
          terms: { projectId: accessibleProjectIds },
        });

        return retrieveTimelines(esTerms);
      })
      .then(result => res.json(util.wrapResponse(req.id, result.rows, result.count)))
      .catch(err => next(err));
  },
];
