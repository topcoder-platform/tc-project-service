'use strict'
import _ from 'lodash'
import validate from 'express-validation'
import { Router } from 'express'

const router = Router()

validate.options({
  status: 422,
  flatten: true,
  allowUnknownBody: false
})

// health check
router.get('/_health', (req, res) => {
  // TODO more checks
  res.status(200).send({
    message: "All-is-well"
  })
})

// All project service endpoints need authentication
var jwtAuth = require('tc-core-library-js').middleware.jwtAuthenticator
router.all('/v4/projects*', jwtAuth())

// Register all the routes
router.route('/v4/projects')
  .post(require('./projects/create'))
  .get(require('./projects/list'))

router.route('/v4/projects/:projectId(\\d+)')
  .get(require('./projects/get'))
  .patch(require('./projects/update'))

router.route('/v4/projects/:projectId(\\d+)/members')
    .post(require('./projectMembers/create'))

router.route('/v4/projects/:projectId(\\d+)/members/:id(\\d+)')
    .delete(require('./projectMembers/delete'))
    .patch(require('./projectMembers/update'))

router.route('/v4/projects/:projectId(\\d+)/attachments')
    .post(require('./attachments/create'))

// router.route('/v4/projects/:projectId(\\d+)/attachments/:id(\\d+)')
//     .delete(require('./projectMembers/delete'))


// register error handler
router.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  // DO NOT REMOVE next arg.. even though eslint
  // complains that it is not being used.
  let content = {}
  let httpStatus = err.status || 500
  // specific for validation errors
  if (err instanceof validate.ValidationError) {
    content.message = err.message + ": " + err.toJSON()
    httpStatus = err.status
  } else {
    content.message = err.message
  }
  var body = {
    id: req.id,
    result: {
      success: false,
      status: httpStatus,
      content: content
    }
  }

  // dvalidateelopment error handler
  // will print stacktrace
  if (_.indexOf(['development', 'test', 'qa'], process.env.ENVIRONMENT) > -1) {
    body.result.debug = err.stack
    if (err.details) {
      body.result.details = err.details
    }
  }
  err.status = err.status || 500
  req.log.error(err)
  res
    .status(err.status)
    .send(body)
})

// catch 404 and forward to error handler
router.use((req, res, next) => {
  var err = new Error('Not Found')
  err.status = 404
  next(err)
})

module.exports = router
