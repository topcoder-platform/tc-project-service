'use strict'

const router = require('express').Router(),
  _ = require('lodash'),
  ev = require('express-validation')

ev.options({
  status: 422,
  flatten: true,
  allowUnknownBody: false
})


// health check
router.get('/_health', (req, res, next) => {
  // TODO more checks
  res.status(200).send({
    message: "All-is-well"
  })
})

// router.route('/v3/tags')
//   .get(require('./tags.list'))
//   .post(require('./tags.create'))
//
// router.route('/v3/tags/:tagId(\\d+)')
//   .get(require('./tags.get'))
//   .put(require('./tags.update'))


// register error handler
router.use((err, req, res, next) => {
  let content = {}
  let httpStatus = 500
  // specific for validation errors
  if (err instanceof ev.ValidationError) {
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

  // development error handler
  // will print stacktrace
  if (_.indexOf(['development', 'test', 'qa'], process.env.ENVIRONMENT) > -1) {
    body.result.debug = err.stack
  }
  res
    .status(err.status || 500)
    .send(body)
})

// catch 404 and forward to error handler
router.use((req, res, next) => {
  var err = new Error('Not Found')
  err.status = 404
  next(err)
})

module.exports = router
