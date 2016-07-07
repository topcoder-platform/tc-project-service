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

const PROJECT_ATTRIBUTES = _.without(_.keys(models.Project.rawAttributes), ['utm', 'deletedAt', 'legacyProjectId'])
const PROJECT_MEMBER_ATTRIBUTES = _.without(_.keys(models.ProjectMember.rawAttributes), ['deletedAt'])

module.exports = [
  permissions('project.view'),
  /**
   * GET projects/{projectId}
   * Get a project by id
   */
  (req, res, next) => {
    const projectId = Number(req.params.projectId)
    var fields = req.query.fields
    fields = fields ? fields.split(',') : []
      // parse the fields string to determine what fields are to be returned
    fields = util.parseFields(fields, {
      'projects': PROJECT_ATTRIBUTES,
      'project_members': PROJECT_MEMBER_ATTRIBUTES
    })

    return models.Project
      .find({
        where: { id: projectId },
        attributes: _.get(fields, 'projects', null),
        raw: true
      })
      .then((project) => {
        if (!project) {
          // returning 404
          var apiErr = new Error(`project not found for id ${projectId}`)
          apiErr.status = 404
          return Promise.reject(apiErr)
        }
        // check context for project members
        project.members = _.map(req.context.currentProjectMembers, (m) => {
          return _.pick(m, fields['project_members'])
        })
        req.log.debug('project', JSON.stringify(project, null, 2))
        res.status(200).json(util.wrapResponse(req.id, project))
      })
      .catch((err) => next(err))
  }
]
