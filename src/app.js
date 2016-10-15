'use strict'

import express from 'express'
import _ from 'lodash'
import bodyParser from 'body-parser'
import config from 'config'
import router from './routes'
import permissions from './permissions'
import coreLib from 'tc-core-library-js'
import expressRequestId from 'express-request-id'
import models from './models'
var app = express()

// =======================
// configuration =========
// =======================
// instantiate core library
// var coreLib = require('tc-core-library-js')


// use body parser so we can get info from POST and/or URL parameters
app.use(bodyParser.urlencoded({
  extended: false
}))
app.use(bodyParser.json())

// add request Id
var addRequestId = expressRequestId()
app.use(addRequestId)

// =======================
// Loger =========
// =======================
let appName = 'tc-projects-service'
switch (process.env.NODE_ENV.toLowerCase()) {
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

// =======================
// Database =========
// =======================
logger.info('Registering models ... ', !!models)


// ========================
// Permissions
// ========================
// require('app/permissions')()
permissions()

// ========================
// Routes
// ========================

app.use(router)
app.routerRef = router

// =======================
// Register events handler
// =======================
require('./events/projects')(app, logger)
require('./events/projectMembers')(app, logger)

// =======================
// Initialize services
// =======================
require('./services')(app, logger)

module.exports = app
