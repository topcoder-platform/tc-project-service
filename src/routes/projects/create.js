'use strict'

import validate from 'express-validation'
import _ from 'lodash'
import Joi from 'joi'

import models from '../../models'
import {PROJECT_TYPE, PROJECT_MEMBER_ROLE, PROJECT_STATUS, USER_ROLE } from '../../constants'
import util from '../../util'
import directProject from '../../services/directProject'

/**
 * API to handle creating a new project.
 * Also creates a direct project for legacy syste
 *
 * Permissions:
 * All Topcoder users are allowed to create a project.
 *
 */
var  permissions = require('tc-core-library-js').middleware.permissions

const createProjectValdiations = {
  body: {
    param: Joi.object().keys({
      name: Joi.string().required(),
      description: Joi.string().required(),
      billingAccountId: Joi.number().positive(),
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
      type: Joi.any().valid(_.values(PROJECT_TYPE)),
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
    const userRole = util.hasRole(req, USER_ROLE.MANAGER)
        ? PROJECT_MEMBER_ROLE.MANAGER
        : PROJECT_MEMBER_ROLE.CUSTOMER
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
      status: PROJECT_STATUS.DRAFT,
      createdBy: req.authUser.userId,
      updatedBy: req.authUser.userId,
      members: [{
        isPrimary: true,
        role: userRole,
        userId: req.authUser.userId,
        updatedBy: req.authUser.userId,
        createdBy: req.authUser.userId,
      }]
    })
    models.sequelize.transaction(() => {
      var newProject = null
      return models.Project
          .create(project, {
            include: [{
              model: models.ProjectMember,
              as: 'members'
            }]
          })
          .then((_newProject) => {
            newProject = _newProject
            req.log.debug('new project created (id# %d, name: %s)',
                newProject.id, newProject.name)
            // create direct project with name and description
            var body = {
              projectName: newProject.name,
              projectDescription: newProject.description
            }
            // billingAccountId is optional field
            if(newProject.billingAccountId){
              body.billingAccountId = newProject.billingAccountId
            }
            return directProject.createDirectProject(req, body)
          })
          .then((resp) => {
            newProject.directProjectId = resp.data.result.content.projectId
            return newProject.save()
          })
          .then(() => {
            return newProject.reload(newProject.id)
          })
          .then(() => {
            newProject = newProject.get({plain: true})
            // remove utm details & deletedAt field
            newProject = _.omit(newProject, ['deletedAt', 'utm'])
            // add an empty attachments array
            newProject.attachments = []
            req.app.emit('internal.project.draft-created', newProject)
            res.status(201).json(util.wrapResponse(req.id, newProject))
          })
          .catch((err) => {
            util.handleError('Error creating project', err, req, next)
          })
    })
  }
]
