'use strict'
/* globals Promise */

import util from '../util'
import models from '../models'
import { USER_ROLE } from '../constants'
import _ from 'lodash'

/**
 * Super admin, Topcoder Managers are allowed to view any projects
 * Co-pilots can view projects they are part of or if no other co-pilot has been
 * assigned. Others can only view projcets that they are part of.
 */
module.exports = (req) => {
  return new Promise((resolve, reject) => {
    const projectId = _.parseInt(req.params.projectId)
    const currentUserId = req.authUser.userId
    return models.ProjectMember.getActiveProjectMembers(projectId)
      .then((members) => {
        req.context = req.context || {}
        req.context.currentProjectMembers = members
        // check if auth user has acecss to this project
        let hasAccess = util.hasRole(req, USER_ROLE.TOPCODER_ADMIN)
          || util.hasRole(req, USER_ROLE.MANAGER)
          || !_.isUndefined(_.find(members, (m) => {return m.userId === currentUserId}))

        // if user is co-pilot and the project doesn't have any copilots then user can access the project
        if (util.hasRole(req, USER_ROLE.COPILOT)) {
          return models.Project.getProjectIdsForCopilot(currentUserId)
            .then(ids => {
              req.context.accessibleProjectIds = ids
              return Promise.resolve(_.indexOf(ids, projectId) > -1)
            })
        } else {
          return Promise.resolve(hasAccess)
        }
      })
      .then(hasAccess => {
        if (!hasAccess) {
          // user is not an admin nor is a registered project member
          return reject(new Error('You do not have permissions to perform this action'))
        }
        return resolve(true)
      })
  })
}
