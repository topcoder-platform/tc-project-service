import _ from 'lodash';
import Promise from 'bluebird';
import models from '../../models';
import { USER_ROLE } from '../../constants';
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
          where: { projectId: { in: projectIds } },
          raw: true,
        }),
      );
    }
    if (projectIds.length && retrieveAttachments) {
      promises.push(
        models.ProjectAttachment.findAll({
          attributes: PROJECT_ATTACHMENT_ATTRIBUTES,
          where: { projectId: { in: projectIds } },
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
        return { rows, count };
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
