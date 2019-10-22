
/* globals Promise */

import _ from 'lodash';
import config from 'config';

import models from '../../models';
import { MANAGER_ROLES } from '../../constants';
import util from '../../util';

const ES_PROJECT_INDEX = config.get('elasticsearchConfig.indexName');
const ES_PROJECT_TYPE = config.get('elasticsearchConfig.docType');

const MATCH_TYPE_EXACT_PHRASE = 1;
const MATCH_TYPE_WILDCARD = 2;
const MATCH_TYPE_SINGLE_FIELD = 3;

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
const PROJECT_MEMBER_INVITE_ATTRIBUTES = _.without(
  _.keys(models.ProjectMemberInvite.rawAttributes),
  'deletedAt',
);
const PROJECT_ATTACHMENT_ATTRIBUTES = _.without(
  _.keys(models.ProjectAttachment.rawAttributes),
  'deletedAt',
);
const PROJECT_PHASE_ATTRIBUTES = _.without(
  _.keys(models.ProjectPhase.rawAttributes),
  'deletedAt',
);
const PROJECT_PHASE_PRODUCTS_ATTRIBUTES = _.without(
  _.keys(models.PhaseProduct.rawAttributes),
  'deletedAt',
);


const escapeEsKeyword = keyword => keyword.replace(/[+-=><!|(){}[&\]^"~*?:\\/]/g, '\\\\$&');

const buildEsFullTextQuery = (keyword, matchType, singleFieldName) => {
  let should = [
    {
      query_string: {
        query: (matchType === MATCH_TYPE_EXACT_PHRASE) ? keyword : `*${keyword}*`,
        analyze_wildcard: (matchType === MATCH_TYPE_WILDCARD),
        fields: ['name^5', 'description^3', 'type^2'],
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
                query: (matchType === MATCH_TYPE_EXACT_PHRASE) ? keyword : `*${keyword}*`,
                analyze_wildcard: (matchType === MATCH_TYPE_WILDCARD || matchType === MATCH_TYPE_SINGLE_FIELD),
                fields: ['details.utm.code^4'],
              },
            },
          },
        },
      },
    },
    {
      nested: {
        path: 'members',
        query: {
          query_string: {
            query: (matchType === MATCH_TYPE_EXACT_PHRASE) ? keyword : `*${keyword}*`,
            analyze_wildcard: (matchType === MATCH_TYPE_WILDCARD),
            fields: ['members.email', 'members.handle', 'members.firstName', 'members.lastName'],
          },
        },
      },
    },
  ];

  if (matchType === MATCH_TYPE_SINGLE_FIELD && singleFieldName === 'ref') {
    // only need to match the second item in the should array
    should = should.slice(1, 2);
  }

  return {
    bool: {
      should,
    },
  };
};

/**
 * Build ES query search request body based on userId and email
 *
 * @param  {String}     userId          the user id
 * @param  {String}     email           the email
 * @return {Array}                      query
 */
const buildEsShouldQuery = (userId, email) => {
  const should = [];
  if (userId) {
    should.push({
      nested: {
        path: 'members',
        query: {
          query_string: {
            query: userId,
            fields: ['members.userId'],
          },
        },
      },
    });
    should.push({
      nested: {
        path: 'invites',
        query: {
          query_string: {
            query: userId,
            fields: ['invites.userId'],
          },
        },
      },
    });
  }

  if (email) {
    should.push({
      nested: {
        path: 'invites',
        query: {
          query_string: {
            query: email,
            fields: ['invites.email'],
          },
        },
      },
    });
  }
  return should;
};

/**
 * Build ES query search request body based on value, keyword, matchType and fieldName
 *
 * @param  {String}     value          the value to build request body for
 * @param  {String}     keyword        the keyword to query
 * @param  {String}     matchType      wildcard match or exact match
 * @param  {Array}      fieldName      the fieldName
 * @return {Object}                    search request body that can be passed to .search api call
 */
const buildEsQueryWithFilter = (value, keyword, matchType, fieldName) => {
  let should = [];
  if (value !== 'details' && value !== 'customer' && value !== 'manager') {
    should = _.concat(should, {
      query_string: {
        query: keyword,
        analyze_wildcard: (matchType === MATCH_TYPE_WILDCARD),
        fields: fieldName,
      },
    });
  }

  if (value === 'details') {
    should = _.concat(should, {
      nested: {
        path: 'details',
        query: {
          nested: {
            path: 'details.utm',
            query: {
              query_string: {
                query: keyword,
                analyze_wildcard: (matchType === MATCH_TYPE_WILDCARD),
                fields: fieldName,
              },
            },
          },
        },
      },
    });
  }

  if (value === 'customer' || value === 'manager') {
    should = _.concat(should, {
      nested: {
        path: 'members',
        query: {
          bool: {
            must: [
              { match: { 'members.role': value } },
              {
                query_string: {
                  query: keyword,
                  analyze_wildcard: (matchType === MATCH_TYPE_WILDCARD),
                  fields: fieldName,
                },
              },
            ],
          },
        },
      },
    });
  }

  return should;
};

/**
 * Prepare search request body based on wildcard query
 *
 * @param  {String}     value          the value to build request body for
 * @param  {String}     keyword        the keyword to query
 * @param  {Array}      fieldName      the fieldName
 * @return {Object}                    search request body that can be passed to .search api call
 */
const setFilter = (value, keyword, fieldName) => {
  if (keyword.indexOf('*') > -1) {
    return buildEsQueryWithFilter(value, keyword, MATCH_TYPE_WILDCARD, fieldName);
  }
  return buildEsQueryWithFilter(value, keyword, MATCH_TYPE_EXACT_PHRASE, fieldName);
};

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
  if (_.get(fields, 'project_member_invites', null)) {
    const memberFields = _.get(fields, 'project_member_invites');
    sourceInclude = sourceInclude.concat(_.map(memberFields, single => `invites.${single}`));
  }
  if (_.get(fields, 'project_phases', null)) {
    const phaseFields = _.get(fields, 'project_phases');
    sourceInclude = sourceInclude.concat(_.map(phaseFields, single => `phases.${single}`));
  }
  if (_.get(fields, 'project_phases_products', null)) {
    const phaseFields = _.get(fields, 'project_phases_products');
    sourceInclude = sourceInclude.concat(_.map(phaseFields, single => `phases.products.${single}`));
  }
  if (_.get(fields, 'attachments', null)) {
    const attachmentFields = _.get(fields, 'attachments');
    sourceInclude = sourceInclude.concat(_.map(attachmentFields, single => `attachments.${single}`));
  }

  if (sourceInclude) {
    searchCriteria._sourceInclude = sourceInclude;        // eslint-disable-line no-underscore-dangle
  }
  // prepare the elasticsearch filter criteria
  const boolQuery = [];
  let mustQuery = [];
  let shouldQuery = [];
  let fullTextQuery;
  if (_.has(criteria, 'filters.id') && _.isArray(criteria.filters.id)) {
    boolQuery.push({
      ids: {
        values: criteria.filters.id,
      },
    });
  } else if (_.has(criteria, 'filters.id')) {
    boolQuery.push({
      term: {
        id: criteria.filters.id,
      },
    });
  }

  if (_.has(criteria, 'filters.name')) {
    mustQuery = _.concat(mustQuery, setFilter('name', criteria.filters.name, ['name']));
  }

  if (_.has(criteria, 'filters.code')) {
    mustQuery = _.concat(mustQuery, setFilter('details', criteria.filters.code, ['details.utm.code']));
  }

  if (_.has(criteria, 'filters.customer')) {
    mustQuery = _.concat(mustQuery, setFilter('customer',
      criteria.filters.customer,
      ['members.firstName', 'members.lastName']));
  }

  if (_.has(criteria, 'filters.manager')) {
    mustQuery = _.concat(mustQuery, setFilter('manager',
      criteria.filters.manager,
      ['members.firstName', 'members.lastName']));
  }

  if (_.has(criteria, 'filters.userId') || _.has(criteria, 'filters.email')) {
    shouldQuery = buildEsShouldQuery(criteria.filters.userId, criteria.filters.email);
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
    const keywordCriterion = criteria.filters.keyword;
    let keyword;
    let matchType;
    let singleFieldName;
    // check exact phrase match first (starts and ends with double quotes)
    if (keywordCriterion.startsWith('"') && keywordCriterion.endsWith('"')) {
      keyword = keywordCriterion;
      matchType = MATCH_TYPE_EXACT_PHRASE;
    }

    if (keywordCriterion.indexOf(' ') > -1 || keywordCriterion.indexOf(':') > -1) {
      const parts = keywordCriterion.split(' ');
      if (parts.length > 0) {
        for (let i = 0; i < parts.length; i += 1) {
          const part = parts[i].trim();
          if (part.length > 4 && part.startsWith('ref:')) {
            keyword = escapeEsKeyword(part.substring(4));
            matchType = MATCH_TYPE_SINGLE_FIELD;
            singleFieldName = part.substring(0, 3);
            break;
          }
        }
      }
    }

    if (!keyword) {
      // Not a specific field search nor an exact phrase search, do a wildcard match
      keyword = criteria.filters.keyword;
      matchType = MATCH_TYPE_WILDCARD;
    }

    fullTextQuery = buildEsFullTextQuery(keyword, matchType, singleFieldName);
  }
  const body = { query: { } };
  if (boolQuery.length > 0) {
    body.query.bool = {
      filter: boolQuery,
    };
  }

  if (mustQuery.length > 0) {
    body.query.bool = _.merge(body.query.bool, {
      must: mustQuery,
    });
  }

  if (shouldQuery.length > 0) {
    const newBody = { query: { bool: { must: [] } } };
    newBody.query.bool.must.push({
      bool: {
        should: shouldQuery,
      },
    });
    if (mustQuery.length > 0 || boolQuery.length > 0) {
      newBody.query.bool.must.push(body.query);
    }

    body.query = newBody.query;
  }

  if (fullTextQuery) {
    body.query = _.merge(body.query, fullTextQuery);
    if (body.query.bool) {
      body.query.bool.minimum_should_match = 1;
    }
  }

  if (fullTextQuery || boolQuery.length > 0 || mustQuery.length > 0 || shouldQuery.length > 0) {
    searchCriteria.body = body;
  }
  return searchCriteria;
};

const retrieveProjectsFromDB = (req, criteria, sort, ffields) => {
  // order by
  const order = sort ? [sort.split(' ')] : [['createdAt', 'asc']];
  let fields = ffields ? ffields.split(',') : [];
    // parse the fields string to determine what fields are to be returned
  fields = util.parseFields(fields, {
    projects: PROJECT_ATTRIBUTES,
    project_members: PROJECT_MEMBER_ATTRIBUTES,
  });
  // make sure project.id is part of fields
  if (_.indexOf(fields.projects, 'id') < 0) fields.projects.push('id');
  const retrieveAttachments = !req.query.fields || req.query.fields.indexOf('attachments') > -1;
  const retrieveMembers = !req.query.fields || !!fields.project_members.length;

  return models.Project.searchText({
    filters: criteria.filters,
    order,
    limit: criteria.limit,
    offset: criteria.offset,
    attributes: _.get(fields, 'projects', null),
  }, req.log)
  .then(({ rows, count }) => {
    const projectIds = _.map(rows, 'id');
    const promises = [];
    // retrieve members
    if (projectIds.length && retrieveMembers) {
      promises.push(
        models.ProjectMember.findAll({
          attributes: _.get(fields, 'ProjectMembers'),
          where: { projectId: { $in: projectIds } },
          raw: true,
        }),
      );
    }
    if (projectIds.length && retrieveAttachments) {
      promises.push(
        models.ProjectAttachment.findAll({
          attributes: PROJECT_ATTACHMENT_ATTRIBUTES,
          where: { projectId: { $in: projectIds } },
          raw: true,
        }),
      );
    }
    // return results after promise(s) have resolved
    return Promise.all(promises)
      .then((values) => {
        const allMembers = retrieveMembers ? values.shift() : [];
        const allAttachments = retrieveAttachments ? values.shift() : [];
        _.forEach(rows, (fp) => {
          const p = fp;
          // if values length is 1 it could be either attachments or members
          if (retrieveMembers) {
            p.members = _.filter(allMembers, m => m.projectId === p.id);
          }
          if (retrieveAttachments) {
            p.attachments = _.filter(allAttachments, a => a.projectId === p.id);
          }
        });
        return { rows, count, pageSize: criteria.limit, page: criteria.page };
      });
  });
};

const retrieveProjects = (req, criteria, sort, ffields) => {
  // order by
  const order = sort ? sort.split(' ') : ['createdAt', 'asc'];
  let fields = ffields ? ffields.split(',') : [];
    // parse the fields string to determine what fields are to be returned
  fields = util.parseFields(fields, {
    projects: PROJECT_ATTRIBUTES,
    project_members: PROJECT_MEMBER_ATTRIBUTES,
    project_member_invites: PROJECT_MEMBER_INVITE_ATTRIBUTES,
    project_phases: PROJECT_PHASE_ATTRIBUTES,
    project_phases_products: PROJECT_PHASE_PRODUCTS_ATTRIBUTES,
    attachments: PROJECT_ATTACHMENT_ATTRIBUTES,
  });
  // make sure project.id is part of fields
  if (_.indexOf(fields.projects, 'id') < 0) {
    fields.projects.push('id');
  }

  const searchCriteria = parseElasticSearchCriteria(criteria, fields, order) || {};
  return new Promise((accept, reject) => {
    const es = util.getElasticSearchClient();
    es.search(searchCriteria).then((docs) => {
      const rows = _.map(docs.hits.hits, single => single._source);     // eslint-disable-line no-underscore-dangle
      accept({ rows, count: docs.hits.total, pageSize: criteria.limit, page: criteria.page });
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
    let filters = _.omit(req.query, 'sort', 'perPage', 'page', 'fields');

    let sort = req.query.sort ? decodeURIComponent(req.query.sort) : 'createdAt';
    if (sort && sort.indexOf(' ') === -1) {
      sort += ' asc';
    }
    const sortableProps = [
      'best match',
      'createdAt', 'createdAt asc', 'createdAt desc',
      'updatedAt', 'updatedAt asc', 'updatedAt desc',
      'lastActivityAt', 'lastActivityAt asc', 'lastActivityAt desc',
      'id', 'id asc', 'id desc',
      'status', 'status asc', 'status desc',
      'name', 'name asc', 'name desc',
      'type', 'type asc', 'type desc',
    ];
    if (!util.isValidFilter(filters,
      ['id', 'status', 'memberOnly', 'keyword', 'type', 'name', 'code', 'customer', 'manager']) ||
      (sort && _.indexOf(sortableProps, sort) < 0)) {
      return util.handleError('Invalid filters or sort', null, req, next);
    }
    // check if user only wants to retrieve projects where he/she is a member
    const memberOnly = _.get(filters, 'memberOnly', false);
    filters = _.omit(filters, 'memberOnly');

    const limit = Math.min(req.query.perPage || config.pageSize, config.pageSize);
    const criteria = {
      filters,
      limit,
      offset: ((req.query.page - 1) * limit) || 0,
      page: req.query.page || 1,
    };
    req.log.info(criteria);
    if (!memberOnly
      && (util.hasAdminRole(req)
          || util.hasRoles(req, MANAGER_ROLES))) {
      // admins & topcoder managers can see all projects
      return retrieveProjects(req, criteria, sort, req.query.fields)
      .then((result) => {
        if (result.rows.length === 0) {
          return retrieveProjectsFromDB(req, criteria, sort, req.query.fields)
            .then(r => util.setPaginationHeaders(req, res, r));
        }
        // set header
        return util.setPaginationHeaders(req, res, result);
      })
        .catch(err => next(err));
    }

    // regular users can only see projects they are members of (or invited, handled below)
    criteria.filters.email = req.authUser.email;
    criteria.filters.userId = req.authUser.userId;
    return retrieveProjects(req, criteria, sort, req.query.fields)
      .then((result) => {
        if (result.rows.length === 0) {
          return retrieveProjectsFromDB(req, criteria, sort, req.query.fields)
            .then(r => util.setPaginationHeaders(req, res, r));
        }
        return util.setPaginationHeaders(req, res, result);
      })
      .catch(err => next(err));
  },
];
