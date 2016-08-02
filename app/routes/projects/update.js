'use strict'

/**
 * API to handle creating a new project.
 * Also creates a direct project for legacy syste
 *
 * Permissions:
 * All Topcoder users are allowed to create a project.
 *
 */
var models = require('app/models'),
  validate = require('express-validation'),
  _        = require('lodash'),
  Joi      = require('joi'),
  util     = require('app/util'),
  constants = require('app/constants'),
  permissions = require('tc-core-library-js').middleware.permissions

const updateProjectValdiations = {
  body: {
    param: Joi.object().keys({
      id: Joi.number().valid(Joi.ref('$params.id')),
      title: Joi.string(),
      description: Joi.string(),
      billingAccountId: Joi.string(),
      status: Joi.any().valid(_.values(constants.PROJECT_STATUS)),
      estimatedPrice: Joi.number().precision(2).positive().allow(null),
      actualPrice: Joi.number().precision(2).positive(),
      terms: Joi.array().items(Joi.number().positive()),
      external: Joi.object().keys({
        id: Joi.string(),
        type: Joi.any().valid('github', 'jira', 'asana', 'other'),
        data: Joi.string().max(300) // TODO - restrict length
      }).allow(null),
      type: Joi.any().valid(_.values(constants.PROJECT_TYPE)),
      details: Joi.any(),
      memers: Joi.any(),
      createdBy: Joi.any(),
      createdAt: Joi.any(),
      updatedBy: Joi.any(),
      updatedAt: Joi.any(),
      challengeEligibility: Joi.array().items(Joi.object().keys({
        role: Joi.string().valid('submitter', 'reviewer', 'copilot'),
        users: Joi.array().items(Joi.number().positive()),
        groups: Joi.array().items(Joi.number().positive())
      })).allow(null)
    })
  }
}

var validateUpdates = (existingProject, updatedProject) => {
  var errors = []
  switch (existingProject.status) {
    case 'completed':
    case 'cancelled':
      errors.push(`cannot update a project that is in ${existingProject.status}' state`)
      break
    case 'draft':
      if (_.get(updatedProject, 'status', '') === 'active') {
        // attempting to launch the project make sure certain
        // properties are set
        if (!updatedProject.billingAccountId) {
          errors.push('\'billingAccountId\' must be set before activating the project')
        }
      }
  }


  return errors
}

module.exports = [
  // handles request validations
  validate(updateProjectValdiations),
  permissions('project.edit'),
  /**
   * POST projects/
   * Create a project if the user has access
   */
  (req, res, next) => {
    var project,
      updatedProps = req.body.param
    var projectId = _.parseInt(req.params.projectId)
    // prune any fields that cannot be updated directly
    updatedProps = _.omit(updatedProps, ['createdBy', 'createdAt', 'updatedBy', 'updatedAt', 'id', 'legacyProjectId'])

    models.sequelize.transaction((t) => {

      return models.Project.findOne({
          where: { id: projectId },
          lock: { of: models.Project }
        })
        .then((_prj) => {
          project = _prj
          if (!project) {
            // handle 404
            let err = new Error(`project not found for id ${projectId}`)
            err.status = 404
            return next(err)
          }
          // run additional validations
          let validationErrors = validateUpdates(project, updatedProps)

          if(validationErrors.length > 0) {
            let err = new Error('Unable to update project')
            _.assign(err, {
              details: JSON.stringify(validationErrors),
              status: 400
            })
            return next(err)
          }

          updatedProps.updatedBy = req.authUser.userId
          _.assign(project, updatedProps)
          return project.save()
        })
        .then(() => {
          return project.reload(project.id)
        })
        .then(() => {
          project = project.get({plain: true})
          project = _.omit(project, ['deletedAt'])
          req.log.debug('updated project', project)
          res.json(util.wrapResponse(req.id, project))
        })
        .catch((err) => next(err))
    })
  }
]
