import Kafka from 'no-kafka';
import config from 'config';
import _ from 'lodash';
/**
 * Initializes Kafka consumer and subscribes for the topics
 * @param   {Object}  handlers Object that holds kafka handlers. Where property name is kafka topic and value is handler
 * @param   {Object}  app Application object
 * @param   {Object}  logger Logger object
 * @return  {Promise} Promise that got resolved on successful consumer creation
 */
export default async function startKafkaConsumer(handlers, app, logger) {
  // Read config and prepare Kafka options object
  const kafkaConfig = config.get('kafkaConfig');

  const options = {};
  if (kafkaConfig.has('groupId')) {
    options.groupId = kafkaConfig.get('groupId');
  }
  if (kafkaConfig.has('url')) {
    options.connectionString = kafkaConfig.get('url');
  }
  if (kafkaConfig.has('clientCert') && kafkaConfig.has('clientCertKey')) {
    const clientCert = kafkaConfig.get('clientCert').replace('\\n', '\n');
    const clientCertKey = kafkaConfig.get('clientCertKey').replace('\\n', '\n');
    options.ssl = {
      cert: clientCert,
      key: clientCertKey,
    };
  }

  const consumer = new Kafka.SimpleConsumer(options);
  await consumer.init();

  /**
   * Function is invoked each time new messages are written to specified topic.
   * Calls handler for each message in messageSet. Outputs errors from handler into logger without
   * interrupting the application.
   * @param   {Array}   messageSet    list of received messages
   * @param   {String}  topic         topic where messages are written
   * @param   {Number}  partition     partition where messages are written
   * @return  {Promise}               Promise
   */
  const onConsume = async (messageSet, topic, partition) => {
    for (let messageIndex = 0; messageIndex < messageSet.length; messageIndex += 1) {
      const kafkaMessage = messageSet[messageIndex];
      // logger.debug(`Consume topic '${topic}' with message: '${kafkaMessage.message.value.toString('utf8')}'.`);
      try {
        const topicConfig = handlers[topic];
        if (!topicConfig) {
          logger.info(`No handler configured for topic "${topic}".`);
          return;
        }

        const busMessage = JSON.parse(kafkaMessage.message.value.toString('utf8'));
        const resource = _.get(busMessage, 'payload.resource');
        // for the message with `resource` remove it from the `payload`
        const payload = resource ? _.omit(busMessage.payload, 'resource') : busMessage.payload;

        // Topic config might have a function directly or object where each resource would have its own handler
        // Function directly:
        //   ```
        //   topicConfig: function() {}
        //   ```
        // Object with function per resource:
        //   ```
        //   topicConfig: {
        //     <resource_name_1>: function() {},
        //     <resource_name_2>: function() {},
        //     <resource_name_3>: function() {},
        //   }
        const handler = _.isFunction(topicConfig) ? topicConfig : topicConfig[resource];

        // some topics may have handlers only for some `resource`
        // if we don't find a handler for particular resource then we don't process the message
        if (handler) {
          // we want message to be processed one by one, so we use `await` inside a loop
          await handler(app, topic, payload); // eslint-disable-line no-await-in-loop
          const resourceMessage = resource ? `resource '${resource}' ` : '';
          logger.info(`Message for topic '${topic}' ${resourceMessage}was successfully processed`);
        }

        // we have commit offset even if don't process the message
        await consumer.commitOffset({ topic, partition, offset: kafkaMessage.offset }); // eslint-disable-line no-await-in-loop
      } catch (error) {
        logger.error(`Message processing for topic '${topic}' failed: ${error}`);
      }
    }
  };

  // Subscribe for all topics defined in handlers
  const promises = Object.keys(handlers).map(topic => consumer.subscribe(topic, onConsume));
  await Promise.all(promises);

  return consumer;
}
