'use strict'

// import validate from 'express-validation'
import _ from 'lodash'
import { EVENT } from '../../constants.js'
import models from '../../models'
import fileService from '../../services/fileService'
import { middleware as tcMiddleware } from 'tc-core-library-js'

/**
 * API to delete a project member.
 *
 */

const permissions = tcMiddleware.permissions

module.exports = [
  permissions('project.delete'),
  (req, res, next) => {
    var projectId = _.parseInt(req.params.projectId)

    models.sequelize.transaction(t => {
      // soft delete the record
      return models.Project.destroy({
        where: { id: projectId },
        cascade: true,
        transaction: t
      })
        .then((count) => {
          if (count === 0) {
            let err = new Error('Project not found')
            err.status = 404
            next(err)
          } else {
            req.app.services.pubsub.publish(
              EVENT.ROUTING_KEY.PROJECT_DELETED,
              { id: projectId },
              { correlationId: req.id }
            )
            res.status(204).json({})
          }
        })
        .catch((err) => next(err))
    })
  }
]
