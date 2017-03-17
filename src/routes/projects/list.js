
/* globals Promise */

import _ from 'lodash';
import config from 'config';
import elasticsearch from 'elasticsearch';

import models from '../../models';
import { USER_ROLE, ELASTICSEARCH_INDICES, ELASTICSEARCH_INDICES_TYPES } from '../../constants';
import util from '../../util';

// the client modifies the config object, so always passed the cloned object
const eClient = new elasticsearch.Client(_.cloneDeep(config.elasticsearchConfig));

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
  const searchCriteria = {
    index: ELASTICSEARCH_INDICES.TC_PROJECT_SERVICE,
    type: ELASTICSEARCH_INDICES_TYPES.PROJECT,
    size: criteria.limit,
    from: criteria.offset,
    sort: `${order[0]}:${order[1]}`,
  };
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
    fullTextQuery = {
      multi_match: {
        query: criteria.filters.keyword,
        fields: ['name', 'description', 'type', 'members.email', 'members.handle',
          'members.firstName', 'members.lastName'],
      },
    };
  }
  const body = { query: { } };
  if (boolQuery.length > 0) {
    body.query.bool = {
      should: boolQuery,
    };
  }
  if (fullTextQuery) {
    body.query = _.merge(body.query, fullTextQuery);
  }

  if (fullTextQuery || boolQuery.length > 0) {
    searchCriteria.body = body;
  }

  return new Promise((accept, reject) => {
    eClient.search(searchCriteria).then((docs) => {
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
    req.log.debug(criteria);

    if (!memberOnly
      && (util.hasRole(req, USER_ROLE.TOPCODER_ADMIN)
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
