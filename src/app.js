import express from 'express';
import methodOverride from 'method-override'
import _ from 'lodash';
import bodyParser from 'body-parser';
import config from 'config';
import coreLib from 'tc-core-library-js';
import expressRequestId from 'express-request-id';
import router from './routes';
import permissions from './permissions';
import models from './models';
import analytics from './events/analytics';

const app = express();

// allows overriding HTTP Method
app.use(methodOverride('X-HTTP-Method-Override'))

// =======================
// configuration =========
// =======================
// instantiate core library
// var coreLib = require('tc-core-library-js')

// use body parser so we can get info from POST and/or URL parameters
app.use(bodyParser.urlencoded({
  extended: false,
}));
app.use(bodyParser.json());

// add request Id
const addRequestId = expressRequestId();
app.use(addRequestId);

// =======================
// Loger =========
// =======================
let appName = 'tc-projects-service';
switch (process.env.NODE_ENV.toLowerCase()) {
  case 'development':
    appName += '-dev';
    break;
  case 'qa':
    appName += '-qa';
    break;
  case 'production':
  default:
    appName += '-prod';
    break;
}
// init logger

const logger = coreLib.logger({
  name: appName,
  level: _.get(config, 'logLevel', 'debug').toLowerCase(),
  captureLogs: config.get('captureLogs'),
  logentriesToken: _.get(config, 'logentriesToken', null),
});
app.use(coreLib.middleware.logger(null, logger));
app.logger = logger;

// =======================
// Database =========
// =======================
logger.info('Registering models ... ', !!models);

// =======================
// Analytics
// =======================
const analyticsKey = config.get('analyticsKey');
if (!_.isEmpty(analyticsKey)) {
  analytics(analyticsKey, app, logger);
}

// ========================
// Permissions
// ========================
// require('app/permissions')()
permissions();

// ========================
// Routes
// ========================

app.use(router);
app.routerRef = router;

// =======================
// Initialize services
// =======================
require('./services')(app, logger);


module.exports = app;
