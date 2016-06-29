'use strict'

/**
 * API to handle retrieving a single project by id
 *
 * Permissions:
 * Only users that have access to the project can retrieve it.
 *
 */
var models = require('app/models'),
  validate = require('express-validation'),
  _ = require('lodash'),
  Joi = require('joi'),
  util = require('app/util'),
  permissions = require('tc-core-library-js').middleware.permissions

const PROJECT_ATTRIBUTES = _.keys(models.Project.rawAttributes)
const PROJECT_MEMBER_ATTRIBUTES = _.keys(models.ProjectMember.rawAttributes)

var _retrieveProject = (req, projectId, fields) => {
  fields = fields ? fields.split(',') : []
    // parse the fields string to determine what fields are to be returned
  fields = util.parseFields(fields, {
    'projects': PROJECT_ATTRIBUTES,
    'project_members': PROJECT_MEMBER_ATTRIBUTES
  })
  return models.Project
    .find({
      where: {
        id: projectId
      },
      attributes: _.get(fields, 'projects', null),
      include: [{
        model: models.ProjectMember,
        as: 'members',
        attributes: _.get(fields, 'project_members', null)
      }]
    })
}
module.exports = [
  // handles request validations
  // FIXME - uncomment this once we have permissions in place
  // permissions('project.create'),
  /**
   * GET projects/{projectId}
   * Get a project by id
   */
  (req, res, next) => {
    const projectId = Number(req.params.projectId)

    if (util.hasRole(req, req.app.locals.ROLES.TOPCODER_ADMIN)) {
      // admin has access to all projects
      return _retrieveProject(req, projectId, req.query.fields)
        .then((project) => {
          return res.json(util.wrapResponse(req.id, project))
        })
        .catch((err) => next(err))
    } else {
      // determine if user has access to the project being retreived
      return models.ProjectMember
        .getProjectIdsForUser(req.authUser.userId)
        .then((accessibleProjectIds) => {
          // return project if it's part of accessbileProjectIds
          if (_.indexOf(accessibleProjectIds, projectId) > -1) {
            // return project
            return _retrieveProject(req, projectId, req.query.fields)
              .then((project) => {
                return res.json(util.wrapResponse(req.id, project))
              })
              .catch((err) => next(err))
          } else {
            // returning 404 even if user doesn't have access to the project
            var apiErr = new Error(`project not found for id ${projectId}`)
            _.assign(apiErr, {
              status: 404
            })
            return Promise.reject(apiErr)
          }
        })
        .catch((err) => next(err))
    }
  }
]
