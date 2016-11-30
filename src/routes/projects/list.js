'use strict'
/* globals Promise */

import _ from 'lodash'

import models from '../../models'
import { USER_ROLE } from '../../constants'
import util from '../../util'

/**
 * API to handle retrieving projects
 *
 * Permissions:
 * Only users that have access to the project can retrieve it.
 *
 */
const PROJECT_ATTRIBUTES = _.without(_.keys(models.Project.rawAttributes),
   'utm',
   'deletedAt'
)
const PROJECT_MEMBER_ATTRIBUTES = _.without(
  _.keys(models.ProjectMember.rawAttributes),
  'deletedAt'
)
const PROJECT_ATTACHMENT_ATTRIBUTES = _.without(
  _.keys(models.ProjectAttachment.rawAttributes),
  'deletedAt'

)
var _retrieveProjects = (req, criteria, sort, fields) => {
  // order by
  const order = sort ? [sort.split(' ')] : [['createdAt', 'asc']]
  fields = fields ? fields.split(',') : []
    // parse the fields string to determine what fields are to be returned
  fields = util.parseFields(fields, {
    'projects': PROJECT_ATTRIBUTES,
    'project_members': PROJECT_MEMBER_ATTRIBUTES
  })
  // make sure project.id is part of fields
  if (_.indexOf(fields.projects, 'id') < 0) fields.projects.push('id')
  let retrieveAttachments = !req.query.fields || req.query.fields.indexOf('attachments') > -1
  let retrieveMembers = !req.query.fields || !!fields.project_members.length

  return models.Project.searchText({
      filters: criteria.filters,
      order,
      limit : criteria.limit,
      offset: criteria.offset,
      attributes: _.get(fields, 'projects', null)
    }, req.log)
  .then( ({rows, count}) => {
    const projectIds = _.map(rows, 'id')
    const promises = []
    // retrieve members
    if (projectIds.length && retrieveMembers) {
      promises.push(
        models.ProjectMember.findAll({
          attributes: _.get(fields, 'ProjectMembers'),
          where: { projectId: { in: projectIds } },
          raw: true
        })
      )
    }
    if (projectIds.length && retrieveAttachments) {
      promises.push(
        models.ProjectAttachment.findAll({
          attributes: PROJECT_ATTACHMENT_ATTRIBUTES,
          where: { projectId: { in: projectIds } },
          raw: true
        })
      )
    }
    // return results after promise(s) have resolved
    return Promise.all(promises)
      .then(values => {
        const allMembers = retrieveMembers ? values.shift() : []
        const allAttachments = retrieveAttachments ? values.shift() : []
        _.forEach(rows, p => {
          // if values length is 1 it could be either attachments or members
          if (retrieveMembers) {
            p.members = _.filter(allMembers, m => m.projectId === p.id)
          }
          if (retrieveAttachments) {
            p.attachments = _.filter(allAttachments, a => a.projectId === p.id)
          }
        })
        return { rows, count }
      })
  })
}

module.exports = [
  /**
   * GET projects/
   * Return a list of projects that match the criteria
   */
  (req, res, next) => {
    // handle filters
    var filters = util.parseQueryFilter(req.query.filter)
    var sort = req.query.sort ? decodeURIComponent(req.query.sort) : 'createdAt'
    if (sort && sort.indexOf(" ") == -1) {
      sort = sort + ' asc'
    }
    const sortableProps = [
      'createdAt', 'createdAt asc', 'createdAt desc',
      'updatedAt', 'updatedAt asc', 'updatedAt desc',
      'id', 'id asc', 'id desc',
      'status', 'status asc', 'status desc',
      'name', 'name asc', 'name desc',
      'type', 'type asc', 'type desc'
    ]
    if (!util.isValidFilter(filters, ['id', 'status', 'type', 'memberOnly', 'keyword']) ||
      (sort && _.indexOf(sortableProps, sort) < 0)) {
      util.handleError('Invalid filters or sort', null, req, next)
    }
    // check if user only wants to retrieve projects where he/she is a member
    const memberOnly = _.get(filters, 'memberOnly', false)
    filters = _.omit(filters, 'memberOnly')

    var criteria = {
      filters: filters,
      limit:  Math.min(req.query.limit || 20, 20),
      offset: req.query.offset || 0
    }
    req.log.debug(criteria)

    if (!memberOnly
      && (util.hasRole(req, USER_ROLE.TOPCODER_ADMIN)
          || util.hasRole(req, USER_ROLE.MANAGER)))
    {
      // admins & topcoder managers can see all projects
      return _retrieveProjects(req, criteria, sort, req.query.fields)
        .then(result => {
          return res.json(util.wrapResponse(req.id, result.rows, result.count))
        })
        .catch(err => next(err))
    } else {
      // If user requested projects where he/she is a member or
      // if they are not a copilot then return projects that they are members in.
      // Copilots can view projects that they are members in or they have
      //
      var getProjectIds = !memberOnly && util.hasRole(req, USER_ROLE.COPILOT) ?
        models.Project.getProjectIdsForCopilot(req.authUser.userId) :
        models.ProjectMember.getProjectIdsForUser(req.authUser.userId)
      return getProjectIds
        .then(accessibleProjectIds => {
          // filter based on accessible
          if (_.get(criteria.filters, 'id', null)) {
            criteria.filters.id['$in'] = _.intersection(
              accessibleProjectIds,
              criteria.filters.id['$in']
            )
          } else {
            criteria.filters.id = { $in : accessibleProjectIds}
          }
          return _retrieveProjects(req, criteria, sort, req.query.fields)
        })
        .then(result => {
          return res.json(util.wrapResponse(req.id, result.rows, result.count))
        })
        .catch(err => next(err))
    }
  }
]
