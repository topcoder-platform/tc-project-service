

import config from 'config';
import elasticsearch from 'elasticsearch';
import _ from 'lodash';
import RabbitMQService from './rabbitmq';

/**
 * Responsible for establishing connections to all external services
 * Also has a hook to load mock services for unit testing.
 *
 * @param   {Object}        fapp      the app object
 * @param   {Object}        logger    the logger to use
 *
 * @return  {Void}                    the function returns void
 */
module.exports = (fapp, logger) => {
  const app = fapp;
  app.services = app.service || {};
  if (process.env.NODE_ENV.toLowerCase() === 'test') {
    require('../tests/serviceMocks')(app);                       // eslint-disable-line global-require
  } else {
    // RabbitMQ Initialization
    app.services.pubsub = new RabbitMQService(app, logger);

    // initialize RabbitMQ
    app.services.pubsub.init(
      config.get('rabbitmqURL'),
      config.get('pubsubExchangeName'),
      config.get('pubsubQueueName'),
    )
    .then(() => {
      logger.info('RabbitMQ service initialized');
    })
    .catch((err) => {
      logger.error('Error initializing services', err);
      // gracefulShutdown()
    });

    // init elasticsearch service
    // the client modifies the config object, so always passed the cloned object
    app.services.es = new elasticsearch.Client(_.cloneDeep(config.elasticsearchConfig));
  }
};
