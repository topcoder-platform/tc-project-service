'use strict'
/* globals Promise */

import util from '../util'
import models from '../models'
import { USER_ROLE } from '../constants'
import _ from 'lodash'

/**
 * Super admin, Topcoder Managers are allowed to edit any project
 * Rest can add members only if they are currently part of the project team.
 */
module.exports = (req) => {
  return new Promise((resolve, reject) => {
    var projectId = _.parseInt(req.params.projectId)
    return models.ProjectMember.getActiveProjectMembers(projectId)
      .then((members) => {
        req.context = req.context || {}
        req.context.currentProjectMembers = members
        // check if auth user has acecss to this project
        let hasAccess = util.hasRole(req, USER_ROLE.TOPCODER_ADMIN)
          || util.hasRole(req, USER_ROLE.TOPCODER_MANAGER)
          || !_.isUndefined(_.find(members, (m) => {return m.userId === req.authUser.userId}))

        if (!hasAccess) {
          // user is not an admin nor is a registered project member
          return reject(new Error('You do not have permissions to perform this action'))
        }
        return resolve(true)
      })
  })
}
