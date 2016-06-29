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
  permissions = require('tc-core-library-js').middleware.permissions

const createProjectValdiations = {
  body: {
    param: Joi.object().keys({
      title: Joi.string().required(),
      description: Joi.string().required(),
      billingAccountId: Joi.string(),
      utm: Joi.object().keys({
        source: Joi.string().allow(null),
        medium: Joi.string().allow(null),
        campaign: Joi.string().allow(null)
      }).allow(null),
      estimatedPrice: Joi.number().precision(2).positive().optional().allow(null),
      terms: Joi.array().items(Joi.number().positive()).optional(),
      external: Joi.object().keys({
        id: Joi.string(),
        type: Joi.any().valid('github', 'jira', 'asana', 'other'),
        data: Joi.string().max(300) // TODO - restrict length
      }).allow(null),
      // TODO - add more types
      type: Joi.any().valid('generic', 'design', 'design+dev'),
      details: Joi.any(),
      challengeEligibility: Joi.array().items(Joi.object().keys({
        role: Joi.string().valid('submitter', 'reviewer', 'copilot'),
        users: Joi.array().items(Joi.number().positive()),
        groups: Joi.array().items(Joi.number().positive())
      })).allow(null)
    })
  }
}

module.exports = [
  // handles request validations
  validate(createProjectValdiations),
  permissions('project.create'),
  /**
   * POST projects/
   * Create a project if the user has access
   */
  (req, res, next) => {
    var project = req.body.param

    // set defaults
    _.defaults(project, {
        createdBy: req.authUser.userId,
        updatedBy: req.authUser.userId,
        challengeEligibility: [],
        external: null,
        utm: null
      })
      // override values
    _.assign(project, {
      status: 'draft',
      createdBy: req.authUser.userId,
      updatedBy: req.authUser.userId,
      members: [{
        isPrimary: true,
        role: util.hasRole(req, req.app.locals.ROLES.TOPCODER_MANAGER) ? 'manager': 'customer',
        userId: req.authUser.userId,
        updatedBy: req.authUser.userId,
        createdBy: req.authUser.userId,
      }]
    })
    models.sequelize.transaction((t) => {
      var newProject = null
      return models.Project
        .create(project, {
          include: [{
            model: models.ProjectMember,
            as: 'members'
          }]
        })
        .then((_newProject) => {
          newProject = _newProject.get({plain: true})
          req.log.debug('new project created (id# %d, title: %s)',
            newProject.id, newProject.title)

          // TODO create direct project
          // remove utm details & deletedAt field
          newProject = _.omit(newProject, ['deletedAt', 'utm'])
          req.app.emit('internal.project.draft-created', newProject)

          res.status(201).json(util.wrapResponse(req.id, newProject))
        })
        .catch((err) => {
          util.handleError('Error creating project', err, req, next)
        })
    })
  }
]
