
/* globals Promise */

import _ from 'lodash';
import config from 'config';

import models from '../../models';
import { USER_ROLE } from '../../constants';
import util from '../../util';

const ES_PROJECT_INDEX = config.get('elasticsearchConfig.indexName');
const ES_PROJECT_TYPE = config.get('elasticsearchConfig.docType');
/**
 * API to handle retrieving projects
 *
 * Permissions:
 * Only users that have access to the project can retrieve it.
 *
 */
const PROJECT_ATTRIBUTES = _.without(_.keys(models.Project.rawAttributes),
   'utm',
   'deletedAt',
);
const PROJECT_MEMBER_ATTRIBUTES = _.without(
  _.keys(models.ProjectMember.rawAttributes),
  'deletedAt',
);
const PROJECT_ATTACHMENT_ATTRIBUTES = _.without(
  _.keys(models.ProjectAttachment.rawAttributes),
  'deletedAt',
);


const escapeEsKeyword = keyword => keyword.replace(/[+-=><!|(){}[&\]^"~*?:\\/]/g, '\\\\$&');
/**
 * Parse the ES search criteria and prepare search request body
 *
 * @param  {Object}     criteria          the filter criteria parsed from client request
 * @param  {Object}     fields            the fields to return
 * @param  {Array}      order             the sort order
 * @return {Object}                       search request body that can be passed to .search api call
 */
const parseElasticSearchCriteria = (criteria, fields, order) => {
  const searchCriteria = {
    index: ES_PROJECT_INDEX,
    type: ES_PROJECT_TYPE,
    size: criteria.limit,
    from: criteria.offset,
  };
  // best match / relevancy is the default sort w/ elasticsearch
  if (order[0].toLowerCase() !== 'best match') {
    searchCriteria.sort = `${order[0]}:${order[1]}`;
  }

  let sourceInclude;
  if (_.get(fields, 'projects', null)) {
    sourceInclude = _.get(fields, 'projects');
  }
  if (_.get(fields, 'project_members', null)) {
    const memberFields = _.get(fields, 'project_members');
    sourceInclude = sourceInclude.concat(_.map(memberFields, single => `members.${single}`));
  }
  sourceInclude = sourceInclude.concat(_.map(PROJECT_ATTACHMENT_ATTRIBUTES, single => `attachments.${single}`));

  if (sourceInclude) {
    searchCriteria._sourceInclude = sourceInclude;        // eslint-disable-line no-underscore-dangle
  }
  // prepare the elasticsearch filter criteria
  const boolQuery = [];
  let fullTextQuery;
  if (_.has(criteria, 'filters.id.$in')) {
    boolQuery.push({
      ids: {
        values: criteria.filters.id.$in,
      },
    });
  }

  if (_.has(criteria, 'filters.status.$in')) {
    // status is an array
    boolQuery.push({
      terms: {
        status: criteria.filters.status.$in,
      },
    });
  } else if (_.has(criteria, 'filters.status')) {
    // status is simple string
    boolQuery.push({
      term: {
        status: criteria.filters.status,
      },
    });
  }

  if (_.has(criteria, 'filters.type.$in')) {
    // type is an array
    boolQuery.push({
      terms: {
        type: criteria.filters.type.$in,
      },
    });
  } else if (_.has(criteria, 'filters.type')) {
    // type is simple string
    boolQuery.push({
      term: {
        type: criteria.filters.type,
      },
    });
  }
  if (_.has(criteria, 'filters.keyword')) {
    // keyword is a full text search
    // escape special fields from keyword search
    const keyword = escapeEsKeyword(criteria.filters.keyword);
    fullTextQuery = {
      bool: {
        should: [
          {
            query_string: {
              query: `*${keyword}*`,
              analyze_wildcard: true,
              fields: ['name^3', 'description', 'type'], // boost name field
            },
          },
          {
            nested: {
              path: 'members',
              query: {
                query_string: {
                  query: `*${keyword}*`,
                  analyze_wildcard: true,
                  fields: ['members.email', 'members.handle', 'members.firstName', 'members.lastName'],
                },
              },
            },
          },
          {
            nested: {
              path: 'details',
              query: {
                nested: {
                  path: 'details.utm',
                  query: {
                    query_string: {
                      query: `*${keyword}*`,
                      analyze_wildcard: true,
                      fields: ['details.utm.code'],
                    },
                  },
                },
              },
            },
          },
        ],
      },
    };
  }
  const body = { query: { } };
  if (boolQuery.length > 0) {
    body.query.bool = {
      must: boolQuery,
    };
  }
  if (fullTextQuery) {
    body.query = _.merge(body.query, fullTextQuery);
  }

  if (fullTextQuery || boolQuery.length > 0) {
    searchCriteria.body = body;
  }

  return searchCriteria;
};


const retrieveProjects = (req, criteria, sort, ffields) => {
  // order by
  const order = sort ? sort.split(' ') : ['createdAt', 'asc'];
  let fields = ffields ? ffields.split(',') : [];
    // parse the fields string to determine what fields are to be returned
  fields = util.parseFields(fields, {
    projects: PROJECT_ATTRIBUTES,
    project_members: PROJECT_MEMBER_ATTRIBUTES,
  });
  // make sure project.id is part of fields
  if (_.indexOf(fields.projects, 'id') < 0) {
    fields.projects.push('id');
  }

  const searchCriteria = parseElasticSearchCriteria(criteria, fields, order);

  return new Promise((accept, reject) => {
    const es = util.getElasticSearchClient();
    es.search(searchCriteria).then((docs) => {
      const rows = _.map(docs.hits.hits, single => single._source);     // eslint-disable-line no-underscore-dangle
      accept({ rows, count: docs.hits.total });
    }).catch(reject);
  });
};

module.exports = [
  /**
   * GET projects/
   * Return a list of projects that match the criteria
   */
  (req, res, next) => {
    // handle filters
    let filters = util.parseQueryFilter(req.query.filter);
    let sort = req.query.sort ? decodeURIComponent(req.query.sort) : 'createdAt';
    if (sort && sort.indexOf(' ') === -1) {
      sort += ' asc';
    }
    const sortableProps = [
      'best match',
      'createdAt', 'createdAt asc', 'createdAt desc',
      'updatedAt', 'updatedAt asc', 'updatedAt desc',
      'id', 'id asc', 'id desc',
      'status', 'status asc', 'status desc',
      'name', 'name asc', 'name desc',
      'type', 'type asc', 'type desc',
    ];
    if (!util.isValidFilter(filters, ['id', 'status', 'type', 'memberOnly', 'keyword']) ||
      (sort && _.indexOf(sortableProps, sort) < 0)) {
      return util.handleError('Invalid filters or sort', null, req, next);
    }
    // check if user only wants to retrieve projects where he/she is a member
    const memberOnly = _.get(filters, 'memberOnly', false);
    filters = _.omit(filters, 'memberOnly');

    const criteria = {
      filters,
      limit: Math.min(req.query.limit || 20, 20),
      offset: req.query.offset || 0,
    };
    req.log.info(criteria);

    if (!memberOnly
      && (util.hasAdminRole(req)
          || util.hasRole(req, USER_ROLE.MANAGER))) {
      // admins & topcoder managers can see all projects
      return retrieveProjects(req, criteria, sort, req.query.fields)
        .then(result => res.json(util.wrapResponse(req.id, result.rows, result.count)))
        .catch(err => next(err));
    }
      // If user requested projects where he/she is a member or
      // if they are not a copilot then return projects that they are members in.
      // Copilots can view projects that they are members in or they have
      //
    const getProjectIds = !memberOnly && util.hasRole(req, USER_ROLE.COPILOT) ?
        models.Project.getProjectIdsForCopilot(req.authUser.userId) :
        models.ProjectMember.getProjectIdsForUser(req.authUser.userId);
    return getProjectIds
        .then((accessibleProjectIds) => {
          // filter based on accessible
          if (_.get(criteria.filters, 'id', null)) {
            criteria.filters.id.$in = _.intersection(
              accessibleProjectIds,
              criteria.filters.id.$in,
            );
          } else {
            criteria.filters.id = { $in: accessibleProjectIds };
          }
          return retrieveProjects(req, criteria, sort, req.query.fields);
        })
        .then(result => res.json(util.wrapResponse(req.id, result.rows, result.count)))
        .catch(err => next(err));
  },
];
