import _ from 'lodash';
import config from 'config';

import models from '../../models';
import { INVITE_STATUS, PROJECT_MEMBER_NON_CUSTOMER_ROLES } from '../../constants';
import util from '../../util';
import { PERMISSION } from '../../permissions/constants';
import permissionUtils from '../../utils/permissions';

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
const PROJECT_MEMBER_ATTRIBUTES = _.without(_.keys(models.ProjectMember.rawAttributes));
// project members has some additional fields stored in ES index, which we don't have in DB
const PROJECT_MEMBER_ATTRIBUTES_ES = _.concat(
  PROJECT_MEMBER_ATTRIBUTES,
  ['handle'], // more fields can be added when allowed by `addUserDetailsFieldsIfAllowed`
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

const SUPPORTED_FILTERS = [
  'id',
  'status',
  'memberOnly',
  'keyword',
  'type',
  'name',
  'code',
  'customer',
  'manager',
  'directProjectId',
];

/**
  * ES need to skip special chars else it is considered as RegEx or other ES query string syntax,
  * see https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-query-string-query.html
  *
  * @param  {String}     keyword        keyword being searched for
  * @return {String}                    result after parsing
  */
const escapeEsKeyword = keyword => keyword.replace(/[+-=><!|(){}[&\]^"~*?:\\/]/g, '\\$&');

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
          bool: {
            must: [
              {
                query_string: {
                  query: userId,
                  fields: ['invites.userId'],
                },
              }, {
                query_string: {
                  query: INVITE_STATUS.PENDING,
                  fields: ['invites.status'],
                },
              },
            ],
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
          bool: {
            must: [
              {
                query_string: {
                  query: email,
                  fields: ['invites.email'],
                },
              }, {
                query_string: {
                  query: INVITE_STATUS.PENDING,
                  fields: ['invites.status'],
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
    const roles = value === 'customer' ? [value] : PROJECT_MEMBER_NON_CUSTOMER_ROLES;
    should = _.concat(should, {
      nested: {
        path: 'members',
        query: {
          bool: {
            must: [
              { terms: { 'members.role': roles } },
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
    searchCriteria._sourceIncludes = sourceInclude; // eslint-disable-line no-underscore-dangle
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

  if (_.has(criteria, 'filters.directProjectId')) {
    mustQuery = _.concat(mustQuery, setFilter('directProjectId',
      criteria.filters.directProjectId,
      ['directProjectId']));
  }

  if (_.has(criteria, 'filters.code')) {
    mustQuery = _.concat(mustQuery, setFilter('details', criteria.filters.code, ['details.utm.code']));
  }

  if (_.has(criteria, 'filters.customer')) {
    mustQuery = _.concat(mustQuery, setFilter('customer',
      criteria.filters.customer,
      ['members.firstName', 'members.lastName', 'members.handle']));
  }

  if (_.has(criteria, 'filters.manager')) {
    mustQuery = _.concat(mustQuery, setFilter('manager',
      criteria.filters.manager,
      ['members.firstName', 'members.lastName', 'members.handle']));
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
      keyword = escapeEsKeyword(keywordCriterion);
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
  // add userId to project_members field so it can be used to check READ_PROJECT_MEMBER permission below.
  const addMembersUserId = fields.project_members.length > 0 && _.indexOf(fields.project_members, 'userId') < 0;
  if (addMembersUserId) {
    fields.project_members.push('userId');
  }
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
              const pMembers = _.filter(allMembers, m => m.projectId === p.id);
              // check if have permission to read project members
              if (util.hasPermission(PERMISSION.READ_PROJECT_MEMBER, req.authUser, pMembers)) {
                if (addMembersUserId) {
                // remove the userId from the returned members array if it was added before
                // as it is only needed for checking permission.
                  _.forEach(pMembers, (m) => {
                    const fm = m;
                    delete fm.userId;
                  });
                }
                p.members = pMembers;
              }
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
    project_members: util.addUserDetailsFieldsIfAllowed(PROJECT_MEMBER_ATTRIBUTES_ES, req),
    project_member_invites: PROJECT_MEMBER_INVITE_ATTRIBUTES,
    project_phases: PROJECT_PHASE_ATTRIBUTES,
    project_phases_products: PROJECT_PHASE_PRODUCTS_ATTRIBUTES,
    attachments: PROJECT_ATTACHMENT_ATTRIBUTES,
  });

  // make sure project.id is part of fields
  if (_.indexOf(fields.projects, 'id') < 0) {
    fields.projects.push('id');
  }
  // add userId to project_members field so it can be used to check READ_PROJECT_MEMBER permission below.
  const addMembersUserId = fields.project_members.length > 0 && _.indexOf(fields.project_members, 'userId') < 0;
  if (addMembersUserId) {
    fields.project_members.push('userId');
  }

  const searchCriteria = parseElasticSearchCriteria(criteria, fields, order) || {};
  return new Promise((accept, reject) => {
    const es = util.getElasticSearchClient();
    es.search(searchCriteria).then((docs) => {
      const rows = _.map(docs.hits.hits, single => single._source); // eslint-disable-line no-underscore-dangle
      if (rows) {
        if (!util.hasPermissionByReq(PERMISSION.READ_PROJECT_INVITE_NOT_OWN, req)) {
          if (util.hasPermissionByReq(PERMISSION.READ_PROJECT_INVITE_OWN, req)) {
            // only include own invites
            const currentUserId = req.authUser.userId;
            const currentUserEmail = req.authUser.email;
            _.forEach(rows, (fp) => {
              const invites = _.filter(fp.invites, invite => (
                (invite.userId !== null && invite.userId === currentUserId) ||
                (invite.email && currentUserEmail && invite.email.toLowerCase() === currentUserEmail.toLowerCase())
              ));
              _.set(fp, 'invites', invites);
            });
          } else {
            // return empty invites
            _.forEach(rows, (fp) => {
              _.set(fp, 'invites', []);
            });
          }
        }
        _.forEach(rows, (p) => {
          const fp = p;
          if (fp.members) {
            // check if have permission to read project members
            if (!util.hasPermission(PERMISSION.READ_PROJECT_MEMBER, req.authUser, fp.members)) {
              delete fp.members;
            }
            if (fp.members && addMembersUserId) {
              // remove the userId from the returned members array if it was added before
              // as it is only needed for checking permission.
              _.forEach(fp.members, (m) => {
                const fm = m;
                delete fm.userId;
              });
            }
          }
        });
      }
      accept({ rows, count: docs.hits.total, pageSize: criteria.limit, page: criteria.page });
    }).catch(reject);
  });
};

module.exports = [
  /*
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
    if (!util.isValidFilter(filters, SUPPORTED_FILTERS) ||
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
    // TODO refactor (DRY) code below so we don't repeat the same logic for admins and non-admin users
    if (!memberOnly && util.hasPermission(PERMISSION.READ_PROJECT_ANY, req.authUser)) {
      // admins & topcoder managers can see all projects
      return retrieveProjects(req, criteria, sort, req.query.fields)
        .then((result) => {
          if (result.rows.length === 0) {
            req.log.debug('No projects found in ES');

            // if we have some filters and didn't get any data from ES
            // we don't fallback to DB, because DB doesn't support all of the filters
            // so we don't want DB to return unrelated data, ref issue #450
            if (_.intersection(_.keys(filters), SUPPORTED_FILTERS).length > 0) {
              req.log.debug('Don\'t fallback to DB because some filters are defined.');
              return util.setPaginationHeaders(req, res,
                util.postProcessInvites('$.rows[*].invites[?(@.email)]', result, req));
            }

            return retrieveProjectsFromDB(req, criteria, sort, req.query.fields)
              .then(r => util.setPaginationHeaders(req, res,
                util.postProcessInvites('$.rows[*].invites[?(@.email)]', r, req)));
          }
          req.log.debug('Projects found in ES');
          // set header
          return util.setPaginationHeaders(req, res,
            util.postProcessInvites('$.rows[*].invites[?(@.email)]', result, req));
        })
        .catch(err => next(err));
    }

    // regular users can only see projects they are members of (or invited, handled below)
    criteria.filters.email = req.authUser.email;
    criteria.filters.userId = req.authUser.userId;
    return retrieveProjects(req, criteria, sort, req.query.fields)
      .then((result) => {
        if (result.rows.length === 0) {
          req.log.debug('No projects found in ES');

          // if we have some filters and didn't get any data from ES
          // we don't fallback to DB, because DB doesn't support all of the filters
          // so we don't want DB to return unrelated data, ref issue #450
          if (_.intersection(_.keys(filters), SUPPORTED_FILTERS).length > 0) {
            req.log.debug('Don\'t fallback to DB because some filters are defined.');

            return result;
          }

          return retrieveProjectsFromDB(req, criteria, sort, req.query.fields);
        }

        req.log.debug('Projects found in ES');

        return result;
      }).then((result) => {
        const postProcessedResult = util.postProcessInvites('$.rows[*].invites[?(@.email)]', result, req);

        postProcessedResult.rows.forEach((project) => {
          // filter out attachments which user cannot see
          if (project.attachments) {
            // eslint-disable-next-line no-param-reassign
            project.attachments = project.attachments.filter(attachment =>
              permissionUtils.hasReadAccessToAttachment(attachment, req),
            );
          }
        });

        return util.setPaginationHeaders(req, res, postProcessedResult);
      })
      .catch(err => next(err));
  },
];
