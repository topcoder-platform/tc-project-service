'use strict'
// include newrelic
if (process.env.ENVIRONMENT !== 'test')
  require('newrelic')

// =======================
// get the packages we need
// =======================
require('app-module-path').addPath(__dirname)

var express = require('express'),
  app = express(),
  _ = require('lodash'),
  bodyParser = require('body-parser'),
  config = require('config')

// =======================
// configuration =========
// =======================
// instantiate core library
var coreLib = require('tc-core-library-js')


// use body parser so we can get info from POST and/or URL parameters
app.use(bodyParser.urlencoded({
  extended: false
}))
app.use(bodyParser.json())

// add request Id
var addRequestId = require('express-request-id')()
app.use(addRequestId)

// =======================
// Database =========
// =======================
var models = require("app/models")


// =======================
// Loger =========
// =======================
let appName = 'tc-projects-service'
switch (process.env.ENVIRONMENT.toLowerCase()) {
  case 'development':
    appName += "-dev"
    break
  case 'qa':
    appName += "-qa"
    break
  case 'production':
  default:
    appName += '-prod'
    break
}
// init logger

var logger = coreLib.logger({
  name: appName,
  level: _.get(config, "logLevel", 'debug').toLowerCase(),
  captureLogs: config.get('captureLogs'),
  logentriesToken: _.get(config, 'logentriesToken', null)
})
app.use(coreLib.middleware.logger(null, logger))
app.logger = logger

// ========================
// Permissions
// ========================
require('app/permissions')()

// ========================
// Routes
// ========================
const router = require('app/routes')
app.use(router)
app.routerRef = router

// =======================
// Register events handler
// =======================
require('app/events/projects')(app, logger)

// =======================
// Initialize services
// =======================
require('app/services')(app, logger)

module.exports = app
