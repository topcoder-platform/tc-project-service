'use strict'

// import validate from 'express-validation'
import _ from 'lodash'

import models from '../../models'
import { middleware as tcMiddleware } from 'tc-core-library-js'

/**
 * API to add a project member.
 *
 */

const permissions = tcMiddleware.permissions

module.exports = [
  permissions('project.removeMember'),
  (req, res, next) => {
    var projectId = _.parseInt(req.params.projectId)
    var memberRecordId = _.parseInt(req.params.id)

    // soft delete the record
    return models.ProjectMember.destroy({
        where: { id: memberRecordId, projectId: projectId }
      })
      .then((deletedRows) => {
        if (deletedRows !== 1) {
          let err = new Error('Record not found')
          err.status = 404
          return next(err)
        }
        return res.status(204).json({})
      })
      .catch((err) => next(err))
  }
]
