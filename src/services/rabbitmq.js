/* globals Promise */
import _ from 'lodash';
import amqplib from 'amqplib';
import handlers from '../events';

module.exports = class RabbitMQService {

  /**
   * constructor
   * @param {Object} logger logger object
   */
  constructor(logger) {
    this.logger = logger;
    this.subscriberCxn = null;
    this.publisherCxn = null;
    this.subscriberQ = null;
  }

  /**
   * initialize rabbit mq connections / exchanges/ queues etc
   * @param {String} rabbitmqURL rabbitmq connection url
   * @param {String} exchangeName rabbitmq exchange name
   * @param {String} queueName rabbitmq queue name
   * @return {Promise} Resolved or rejected promise
   */
  init(rabbitmqURL, exchangeName, queueName) {
    const self = this;
    self.rabbitmqURL = rabbitmqURL;
    self.exchangeName = exchangeName;
    self.queueName = queueName;
    return self.createConnection()
      .then((conn) => {
        self.logger.debug('Publisher connection created');
        self.publisherCxn = conn;
        // subscriber connection
        return self.createConnection();
      }).then((conn) => {
        self.logger.debug('Subscriber connection created');
        self.subscriberCxn = conn;
        return self.initSubscriber();
      })
      .catch((err) => {
        self.logger.error(err);
      });
  }

  /**
   * helper function to create a connection to rabbitmq
   * @return {promise}           promise
   * @private
   */
  createConnection() {
    return amqplib.connect(this.rabbitmqURL);
  }

  /**
   * Helper function to handle initializing subscribers
   * @return {promise} resolved promise
   * @private
   */
  initSubscriber() {
    const self = this;
    let channel = null;
    // create channel to setup exchanges + queues + bindings
    // on subscriber connection
    return self.subscriberCxn.createChannel()
      .then((ch) => {
        // assert / create exchanges
        self.logger.debug('Channel created');
        channel = ch;
        return channel.assertExchange(self.exchangeName, 'topic', {
          durable: true,
        });
      }).then(() => {
        // create queue
        // a single queue for project service will suffice
        self.logger.debug('Exchange created');
        // with default params - exclusive:false, durable: true, autoDelete: false
        return channel.assertQueue(self.queueName);
      }).then((qok) => {
        self.logger.debug('Queue %s created', self.queueName);
        self.subscriberQ = qok.queue;
        // bindings for the queue
        // all these keys/bindings should be routed to the same queue
        const bindings = _.keys(handlers);
        self.logger.debug('Adding bindings: ', bindings);
        const bindingPromises = _.map(bindings, rk =>
          channel.bindQueue(self.subscriberQ, self.exchangeName, rk));
        return Promise.all(bindingPromises);
      })
      .then(() =>
        channel.consume(self.subscriberQ, (msg) => {
          const key = msg.fields.routingKey;
          // create a child logger so we can trace with original request id
          const cLogger = self.logger.child({
            requestId: msg.properties.correlationId,
          });
          cLogger.debug('Received Message', key, msg.fields);
          const handler = handlers[key];
          if (!_.isFunction(handler)) {
            cLogger.error(`Unknown message type: ${key}, NACKing... `);
            // channel.nack(msg, false, false)
          } else {
            handler(cLogger, msg, channel);
          }
        }),
      )
      .then(() => {
        self.logger.info('Waiting for messages .... ');
      })
      .catch((err) => {
        // channel.close()
        self.logger.error(err);
      });
  }


  /**
   * gracefully shutdown any open connections
   * @return {[type]} [description]
   */
  disconnect() {
    // TODO shutdown channel
    // shutdown connections
    const self = this;
    return new Promise((resolve) => {
      const promises = _.map([self.subscriberCxn, self.publisherCxn], (conn) => {
        conn.close();
      });
      Promise.all(promises)
        .then(() => {
          self.logger.info('Disconnected from rabbitmq');
          resolve();
        }).catch((err) => {
          self.logger.error('ERROR Closing connection', err);
        });
    });
  }

  /**
   * Publish message to default exchange
   * @param {string} key     routing key
   * @param {object} payload message payload
   * @param {Object} props   message properties (optional)
   * @returns {Promise}      promise
   */
  publish(key, payload, props = {}) {
    let channel = null;
    const self = this;
    // first create a channel - this is a lightweight connection
    return self.publisherCxn.createChannel()
      .then((ch) => {
        channel = ch;
        // make sure the exchance exisits, else create it
        return channel.assertExchange(self.exchangeName, 'topic', {
          durable: true,
        });
      }).then(() => {
        // publish the message
        const updatedProps = _.defaults(props, {
          contentType: 'application/json',
        });
        channel.publish(
          self.exchangeName,
          key,
          new Buffer(JSON.stringify(payload)),
          updatedProps,
        );
        self.logger.debug('Published msg to exchange %s with key: %s', self.exchangeName, key);
        return channel.close();
      })
      .catch((err) => {
        self.logger.error(err);
        return channel.close();
      });
  }
};
