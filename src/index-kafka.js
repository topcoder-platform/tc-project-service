import _ from 'lodash';
import config from 'config';
import startKafkaConsumer from './services/kafkaConsumer';
import kafkaHandlers from './events/kafkaHandlers';
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

const app = { logger, models };

const consumerPromise = startKafkaConsumer(kafkaHandlers, app, logger);

/**
 * Handle server shutdown gracefully
 * @returns {undefined}
 */
function gracefulShutdown() {
  logger.info('Gracefully shutting down Kafka consumer...');
  consumerPromise.then(async (consumer) => {
    try {
      await consumer.end();
      logger.info('Successfully stopped Kafka consumer.');
      process.exit(0);
    } catch (error) {
      logger.error('Failed to stop Kafka consumer.');
      process.exit(1);
    }
  });

  // if during some time couldn't gracefully shutdown, then force exiting
  const timeout = 10; // seconds
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down.');
    process.exit(1);
  }, timeout * 1000);
}
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

module.exports = consumerPromise;
