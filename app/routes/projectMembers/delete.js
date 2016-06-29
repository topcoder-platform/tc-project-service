'use strict'

/**
 * API to add a project member.
 *
 */
var models = require('app/models'),
  validate = require('express-validation'),
  _ = require('lodash'),
  Joi = require('joi'),
  util = require('app/util'),
  permissions = require('tc-core-library-js').middleware.permissions


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
