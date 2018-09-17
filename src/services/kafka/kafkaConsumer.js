import Kafka from 'no-kafka';
import config from 'config';
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
  if (kafkaConfig.has('hosts')) {
    options.connectionString = kafkaConfig.get('hosts');
  }
  if (kafkaConfig.has('clientCert') && kafkaConfig.has('clientCertKey')) {
    options.ssl = {
      cert: kafkaConfig.get('clientCert'),
      key: kafkaConfig.has('clientCertKey'),
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
    messageSet.forEach(async (kafkaMessage) => {
      try {
        const handler = handlers[topic];
        if (!handler) {
          logger.info(`No handler configured for topic: ${topic}`);
          return;
        }

        await handler(app, topic, kafkaMessage.message.value.toString('utf8'));
        await consumer.commitOffset({ topic, partition, offset: kafkaMessage.offset });
        logger.info(`Message for topic '${topic}' was successfully processed`);
      } catch (error) {
        logger.error(`Message processing failed: ${error}`);
      }
    });
  };

  // Subscribe for all topics defined in handlers
  const promises = Object.keys(handlers).map(topic => consumer.subscribe(topic, onConsume));
  await Promise.all(promises);
}
