import _ from 'lodash';
import config from 'config';
import Promise from 'bluebird';
import models from '../../models';
import { MANAGER_ROLES } from '../../constants';
import util from '../../util';

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

module.exports = [
  /**
   * GET projects/
   * Return a list of projects that match the criteria
   */
  (req, res, next) => {
    // handle filters
    let filters = _.omit(req.query, 'sort', 'perPage', 'page', 'fields');

    let sort = req.query.sort ? req.query.sort : 'createdAt';
    if (sort && sort.indexOf(' ') === -1) {
      sort += ' asc';
    }
    const sortableProps = [
      'createdAt', 'createdAt asc', 'createdAt desc',
      'updatedAt', 'updatedAt asc', 'updatedAt desc',
      'lastActivityAt', 'lastActivityAt asc', 'lastActivityAt desc',
      'id', 'id asc', 'id desc',
      'status', 'status asc', 'status desc',
      'name', 'name asc', 'name desc',
      'type', 'type asc', 'type desc',
    ];
    // TODO Add customer and manager filters
    if (!util.isValidFilter(filters, ['id', 'status', 'type', 'memberOnly', 'keyword', 'name', 'code']) ||
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
    req.log.debug(criteria);

    if (!memberOnly
      && (util.hasAdminRole(req)
          || util.hasRoles(req, MANAGER_ROLES))) {
      // admins & topcoder managers can see all projects
      return retrieveProjects(req, criteria, sort, req.query.fields)
        .then(result => util.setPaginationHeaders(req, res, result))
        .catch(err => next(err));
    }

    // regular users can only see projects they are members of (or invited, handled bellow)
    criteria.filters.userId = req.authUser.userId;
    criteria.filters.email = req.authUser.email;
    return retrieveProjects(req, criteria, sort, req.query.fields)
      .then(result => util.setPaginationHeaders(req, res, result))
      .catch(err => next(err));
  },
];
