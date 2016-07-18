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
  config   = require('config'),
  Joi      = require('joi'),
  util     = require('app/util'),
  path     = require('path'),
  permissions = require('tc-core-library-js').middleware.permissions

const addAttachmentValidations = {
  body: {
    param: Joi.object().keys({
      title: Joi.string().required(),
      description: Joi.string().optional(),
      filePath: Joi.string().required(),
      s3Bucket: Joi.string().required(),
      contentType: Joi.string().required()
    })
  }
}

module.exports = [
  // handles request validations
  validate(addAttachmentValidations),
  permissions('project.addAttachment'),
  /**
   * POST projects/
   * Create a project if the user has access
   */
  (req, res, next) => {
    var data = req.body.param
    // default values
    var projectId = req.params.projectId
    _.assign(data, {
      projectId: projectId,
      createdBy: req.authUser.userId,
      updatedBy: req.authUser.userId
    })

    // extract file name
    var fileName = path.parse(data.filePath).base
    // create file path
    var filePath = _.join([
        config.get('projectAttachmentPathPrefix'),
        data.projectId,
        config.get('projectAttachmentPathPrefix'),
        fileName
      ], '/')
    var destinationUri = null,
      newAttachment = null

    // get presigned Url
    var httpClient = util.getHttpClient(req)
    httpClient.defaults.headers.common['Authorization'] = req.headers.authorization

    let fileServiceUrl = config.get('fileServiceEndpoint')
    if (fileServiceUrl.substr(-1) !== '/') fileServiceUrl += '/'

    // get pre-signed Url
    req.log.debug('requesting presigned Url')
    return httpClient.post(fileServiceUrl + 'uploadurl/', {
      param: {
        filePath: filePath,
        contentType: data.contentType,
        isPublic: false
      }
    })
    .then((resp) => {
      req.log.debug('Presigned Url resp: ', JSON.stringify(resp.data, null, 2))
      if (resp.status !== 200 || resp.data.result.status !== 200) {
        return Promise.reject(new Error(resp.result.message))
      }
      // store deistination path & url
      destinationUri = _.join([
        's3:/',
        config.get('attachmentsS3Bucket'),
        filePath
      ], '/')
      let sourceUri = 's3://' + data.s3Bucket +  '/' + data.filePath
      req.log.debug('Moving s3 file')
      return util.s3FileTransfer(req, sourceUri, destinationUri)
    })
    .then(() => {
      // file copied to final destination, create DB record
      req.log.debug('creating db record')
      return models.ProjectAttachment
        .create({
          projectId: projectId,
          createdBy: req.authUser.userId,
          updatedBy: req.authUser.userId,
          title: data.title,
          description: data.description,
          contentType: data.contentType,
          filePath: filePath
        })
    })
    .then((_newAttachment) => {
      newAttachment = _newAttachment.get({plain: true})
      req.log.debug('New Attachment record: ', newAttachment)
      // retrieve download url for the response
        req.log.debug('retrieving download url')
        return httpClient.post(fileServiceUrl + 'downloadurl', {
          param: {
            filePath: filePath
          }
        })
      })
      .then((resp) => {
        req.log.debug('Retreiving Presigned Url resp: ', JSON.stringify(resp.data, null, 2))
        if (resp.status !== 200 || resp.data.result.status !== 200) {
          return Promise.reject(new Error("Unable to fetch pre-signed url"))
        }
      let response = _.cloneDeep(newAttachment)
      response = _.omit(response, ['filePath', 'deletedAt'])

      response.url = resp.data.result.content.preSignedURL
      res.status(201).json(util.wrapResponse(req.id, response))
    })
    .catch(function(err) {
      req.log.error("Error adding attachment", err)
      err.status = err.status || 500
      next(err)
    })

  }
]
