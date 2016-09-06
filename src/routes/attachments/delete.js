'use strict'

// import validate from 'express-validation'
import _ from 'lodash'

import models from '../../models'
import fileService from '../../services/fileService'
import { middleware as tcMiddleware } from 'tc-core-library-js'

/**
 * API to delete a project member.
 *
 */

const permissions = tcMiddleware.permissions

module.exports = [
  permissions('project.removeAttachment'),
  (req, res, next) => {
    var projectId = _.parseInt(req.params.projectId)
    var attachmentId = _.parseInt(req.params.id)

    models.sequelize.transaction(() => {
      // soft delete the record
      return models.ProjectAttachment.findOne({
        where: {id: attachmentId, projectId: projectId}
      })
          .then((attachment) => {
            if (!attachment) {
              let err = new Error('Record not found')
              err.status = 404
              return Promise.reject(err)
            }
            return attachment.destroy()
          })
          .then((attachment) => {
            fileService.deleteFile(req, attachment.filePath)
          })
          .then(() => res.status(204).json({}))
          .catch((err) => next(err))
    })
  }
]
