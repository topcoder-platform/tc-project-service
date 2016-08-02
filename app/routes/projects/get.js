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

const PROJECT_ATTRIBUTES = _.without(_.keys(models.Project.rawAttributes), 'utm', 'deletedAt', 'legacyProjectId')
const PROJECT_MEMBER_ATTRIBUTES = _.without(_.keys(models.ProjectMember.rawAttributes), 'deletedAt')

module.exports = [
  permissions('project.view'),
  /**
   * GET projects/{projectId}
   * Get a project by id
   */
  (req, res, next) => {
    const projectId = Number(req.params.projectId)
    console.log('PROJECT_ID', projectId)
    var fields = req.query.fields
    fields = fields ? fields.split(',') : []
      // parse the fields string to determine what fields are to be returned
    fields = util.parseFields(fields, {
      'projects': PROJECT_ATTRIBUTES,
      'project_members': PROJECT_MEMBER_ATTRIBUTES
    })
    var project
    return models.Project
      .find({
        where: { id: projectId },
        attributes: _.get(fields, 'projects', null),
        raw: true
      })
      .then((_project) => {
        console.log("FOUND project", _project)
        project = _project
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
        // check if attachments field was requested
        if (!req.query.fields || _.indexOf(req.query.fields, 'attachments') > -1) {
          return models.ProjectAttachment.getActiveProjectAttachments(project.id)
        }
        else {
          // return null if attachments were not requested.
          return Promise.resolve(null)
        }
      })
      .then((attachments) => {
        // if attachments were requested
        if (attachments) {
          project.attachments = attachments
        }
        req.log.debug('attachment', project.attachments)
        let promises = []
        _.each(project.attachments, (a) => {
          promises.push(util.getFileDownloadUrl(req, a.filePath))
        })
        return Promise.all(promises)
      })
      .then((result) => {
        // result is an array of 'tuples' => [[path, url], [path,url]]
        // convert it to a map for easy lookup
        let urls = _.fromPairs(result)
        _.each(project.attachments, (a) => {
          a.downloadUrl = urls[a.filePath]
        })
        req.log.debug('project', JSON.stringify(project, null, 2))
        res.status(200).json(util.wrapResponse(req.id, project))
      })
      .catch((err) => next(err))
  }
]
