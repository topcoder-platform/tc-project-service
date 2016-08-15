'use strict'

import validate from 'express-validation'
import _ from 'lodash'
import Joi from 'joi'
import models from '../../models'
import util from '../../util'
import { PROJECT_MEMBER_ROLE } from '../../constants'
import directProject from '../../services/directProject'
import { middleware as tcMiddleware} from 'tc-core-library-js'


/**
 * API to add a project member.
 *
 */

const permissions = tcMiddleware.permissions

const addMemberValidations = {
  body: {
    param: Joi.object().keys({
      userId: Joi.number().required(),
      isPrimary: Joi.boolean(),
      role: Joi.any().valid(PROJECT_MEMBER_ROLE.CUSTOMER, PROJECT_MEMBER_ROLE.MANAGER, PROJECT_MEMBER_ROLE.COPILOT).required()
    })
  }
}

module.exports = [
  // handles request validations
  validate(addMemberValidations),
  permissions('project.addMember'),
  (req, res, next) => {
    var member = req.body.param
    var projectId = _.parseInt(req.params.projectId)

    // set defaults
    _.assign(member, {
      projectId: projectId,
      createdBy: req.authUser.userId,
      updatedBy: req.authUser.userId
    })
    let members = req.context.currentProjectMembers

    // check if member is already registered
    let existingMember = _.find(members, (m) => {
      return m.userId === member.userId
    })
    if (existingMember) {
      let err = new Error('User already registered for role: ' + existingMember.role)
      err.status = 400
      return next(err)
    }
    // check if another member is registered for this role as primary,
    // if not mark this member as primary
    if (_.isUndefined(member.isPrimary)) {
      member.isPrimary = _.isUndefined(_.find(members, (m) => {
        return m.isPrimary && m.role === member.role
      }))
    }
    req.log.debug('creating member', member)
    let newMember = null
    // register member
    return models.ProjectMember.create(member)
        .then((_newMember) => {
          newMember = _newMember.get({plain: true})
          if(newMember.role === PROJECT_MEMBER_ROLE.COPILOT) {
            // Add co-pilot when a co-pilot is added to a project
            return models.Project.getDirectProjectId(projectId)
                .then(directProjectId => {
                  if(directProjectId){
                    return  directProject.addCopilot(req, directProjectId, {
                      copilotUserId: newMember.userId
                    })
                  } else {
                    return Promise.resolve()
                  }
                })
          } else {
            return Promise.resolve()
          }
        })
        .then(() => {
          // TODO fire event
          req.app.emit('internal.project.member-registered', newMember)
          res.status(201).json(util.wrapResponse(req.id, newMember))
        })
        .catch((err) => {
          req.log.error('Unable to register ', err)
          next(err)
        })

  }
]
