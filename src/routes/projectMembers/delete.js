'use strict'

// import validate from 'express-validation'
import _ from 'lodash'

import models from '../../models'
import directProject from '../../services/directProject'
import { PROJECT_MEMBER_ROLE } from '../../constants'
import { middleware as tcMiddleware } from 'tc-core-library-js'

/**
 * API to delete a project member.
 *
 */

const permissions = tcMiddleware.permissions

module.exports = [
  permissions('project.removeMember'),
  (req, res, next) => {
    var projectId = _.parseInt(req.params.projectId)
    var memberRecordId = _.parseInt(req.params.id)

    models.sequelize.transaction(() => {
      // soft delete the record
      return models.ProjectMember.findOne({
        where: {id: memberRecordId, projectId: projectId}
      })
          .then((member) => {
            if (!member) {
              let err = new Error('Record not found')
              err.status = 404
              return Promise.reject(err)
            }
            return member.destroy()
          })
          .then((member) => {
            if(member.role === PROJECT_MEMBER_ROLE.COPILOT) {
              return models.Project.getDirectProjectId(projectId)
                  .then(directProjectId => {
                    if(directProjectId){
                      return  directProject.deleteCopilot(req, directProjectId, {
                        copilotUserId: member.userId
                      })
                    } else {
                      return Promise.resolve()
                    }
                  })
            } else {
              return Promise.resolve()
            }
          })
          .then(() => res.status(204).json({}))
          .catch((err) => next(err))
    })
  }
]
