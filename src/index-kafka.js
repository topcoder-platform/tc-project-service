import _ from 'lodash';
import config from 'config';
import startKafkaConsumer from './services/kafkaConsumer';
import { kafkaHandlers } from './events';
import models from './models';

const coreLib = require('tc-core-library-js');


// =======================
// Loger =========
// =======================
let appName = 'tc-projects-consumer';
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

const logger = coreLib.logger({
  name: appName,
  level: _.get(config, 'logLevel', 'debug').toLowerCase(),
  captureLogs: config.get('captureLogs'),
  logentriesToken: _.get(config, 'logentriesToken', null),
});

// =======================
// Database =========
// =======================
logger.info('Registering models ... ', !!models);

/**
 * Handle server shutdown gracefully
 * @returns {undefined}
 */
function gracefulShutdown() {
  // TODO
}
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

const app = { logger, models };

module.exports = startKafkaConsumer(kafkaHandlers, app, logger);
