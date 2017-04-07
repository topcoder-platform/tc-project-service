/**
 * Event handlers for project create, update and delete
 */
import _ from 'lodash';
import Promise from 'bluebird';
import config from 'config';
import util from '../../util';

const ES_PROJECT_INDEX = config.get('elasticsearchConfig.indexName');
const ES_PROJECT_TYPE = config.get('elasticsearchConfig.docType');
const eClient = util.getElasticSearchClient();

/**
 * Handler for project creation event
 * @param  {Object} logger  logger to log along with trace id
 * @param  {Object} msg     event payload
 * @param  {Object} channel channel to ack, nack
 * @returns {undefined}
 */
const projectCreatedHandler = Promise.coroutine(function* (logger, msg, channel) { // eslint-disable-line func-names
  const data = JSON.parse(msg.content.toString());
  const userIds = data.members ? data.members.map(single => `userId:${single.userId}`) : [];
  try {
    // retrieve member details
    const memberDetails = yield util.getMemberDetailsByUserIds(userIds, msg.properties.correlationId, logger);
    // if no members are returned than this should result in nack
    if (!_.isArray(memberDetails) || memberDetails.length === 0) {
      logger.error(`Empty member details for userIds ${userIds.join(',')} requeing the message`);
      channel.nack(msg, false, !msg.fields.redelivered);
      return undefined;
    }
    // update project member record with details
    data.members = data.members.map((single) => {
      const detail = _.find(memberDetails, md => md.userId === single.userId);
      return _.merge(single, _.pick(detail, 'handle', 'firstName', 'lastName', 'email'));
    });
    // add the record to the index
    const result = yield eClient.index({
      index: ES_PROJECT_INDEX,
      type: ES_PROJECT_TYPE,
      id: data.id,
      body: data,
    });
    logger.debug(`project indexed successfully (projectId: ${data.id})`, result);
    channel.ack(msg);
    return undefined;
  } catch (error) {
    logger.error(`Error processing event (projectId: ${data.id})`, error);
    channel.nack(msg, false, !msg.fields.redelivered);
    return undefined;
  }
});

/**
 * Handler for project updated event
 * @param  {Object} logger  logger to log along with trace id
 * @param  {Object} msg     event payload
 * @param  {Object} channel channel to ack, nack
 * @returns {undefined}
 */
const projectUpdatedHandler = Promise.coroutine(function* (logger, msg, channel) { // eslint-disable-line func-names
  const data = JSON.parse(msg.content.toString());
  try {
    // first get the existing document and than merge the updated changes and save the new document
    const doc = yield eClient.get({ index: ES_PROJECT_INDEX, type: ES_PROJECT_TYPE, id: data.original.id });
    const merged = _.merge(doc._source, data.updated);        // eslint-disable-line no-underscore-dangle
    // update the merged document
    yield eClient.update({
      index: ES_PROJECT_INDEX,
      type: ES_PROJECT_TYPE,
      id: data.original.id,
      body: {
        doc: merged,
      },
    });
    logger.debug(`project updated successfully in elasticsearh index, (projectId: ${data.id})`);
    channel.ack(msg);
    return undefined;
  } catch (error) {
    logger.error(`failed to get project document, (projectId: ${data.id})`, error);
    channel.nack(msg, false, !msg.fields.redelivered);
    return undefined;
  }
});

/**
 * Handler for project deleted event
 * @param  {Object} logger  logger to log along with trace id
 * @param  {Object} msg     event payload
 * @param  {Object} channel channel to ack, nack
 * @returns {undefined}
 */
const projectDeletedHandler = Promise.coroutine(function* (logger, msg, channel) { // eslint-disable-line func-names
  const data = JSON.parse(msg.content.toString());
  try {
    yield eClient.delete({ index: ES_PROJECT_INDEX, type: ES_PROJECT_TYPE, id: data.id });
    logger.debug(`project deleted successfully from elasticsearh index (projectId: ${data.id})`);
    channel.ack(msg);
    return undefined;
  } catch (error) {
    logger.error(`failed to delete project document (projectId: ${data.id})`, error);
    channel.nack(msg, false, !msg.fields.redelivered);
    return undefined;
  }
});

module.exports = {
  projectCreatedHandler,
  projectUpdatedHandler,
  projectDeletedHandler,
};
