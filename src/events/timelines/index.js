/**
 * Event handlers for timeline create, update and delete
 */
import _ from 'lodash';
import Promise from 'bluebird';
import config from 'config';
import util from '../../util';

const ES_TIMELINE_INDEX = config.get('elasticsearchConfig.timelineIndexName');
const ES_TIMELINE_TYPE = config.get('elasticsearchConfig.timelineDocType');
const eClient = util.getElasticSearchClient();

/**
 * Handler for timeline creation event
 * @param  {Object} logger  logger to log along with trace id
 * @param  {Object} msg     event payload
 * @param  {Object} channel channel to ack, nack
 */
const timelineAddedHandler = Promise.coroutine(function* (logger, msg, channel) { // eslint-disable-line func-names
  const data = JSON.parse(msg.content.toString());
  try {
    // add the record to the index
    const result = yield eClient.index({
      index: ES_TIMELINE_INDEX,
      type: ES_TIMELINE_TYPE,
      id: data.id,
      body: data,
    });
    logger.debug(`timeline indexed successfully (timelineId: ${data.id})`, result);
    channel.ack(msg);
  } catch (error) {
    logger.error(`Error processing event (timelineId: ${data.id})`, error);
    channel.nack(msg, false, !msg.fields.redelivered);
  }
});

/**
 * Handler for timeline updated event
 * @param  {Object} logger  logger to log along with trace id
 * @param  {Object} msg     event payload
 * @param  {Object} channel channel to ack, nack
 */
const timelineUpdatedHandler = Promise.coroutine(function* (logger, msg, channel) { // eslint-disable-line func-names
  const data = JSON.parse(msg.content.toString());
  try {
    // first get the existing document and than merge the updated changes and save the new document
    const doc = yield eClient.get({ index: ES_TIMELINE_INDEX, type: ES_TIMELINE_TYPE, id: data.original.id });
    const merged = _.merge(doc._source, data.updated);        // eslint-disable-line no-underscore-dangle
    merged.milestones = data.updated.milestones;
    // update the merged document
    yield eClient.update({
      index: ES_TIMELINE_INDEX,
      type: ES_TIMELINE_TYPE,
      id: data.original.id,
      body: {
        doc: merged,
      },
    });
    logger.debug(`timeline updated successfully in elasticsearh index, (timelineId: ${data.original.id})`);
    channel.ack(msg);
  } catch (error) {
    logger.error(`failed to get timeline document, (timelineId: ${data.original.id})`, error);
    channel.nack(msg, false, !msg.fields.redelivered);
  }
});

/**
 * Handler for timeline deleted event
 * @param  {Object} logger  logger to log along with trace id
 * @param  {Object} msg     event payload
 * @param  {Object} channel channel to ack, nack
 */
const timelineRemovedHandler = Promise.coroutine(function* (logger, msg, channel) { // eslint-disable-line func-names
  const data = JSON.parse(msg.content.toString());
  try {
    yield eClient.delete({ index: ES_TIMELINE_INDEX, type: ES_TIMELINE_TYPE, id: data.id });
    logger.debug(`timeline deleted successfully from elasticsearh index (timelineId: ${data.id})`);
    channel.ack(msg);
  } catch (error) {
    logger.error(`failed to delete timeline document (timelineId: ${data.id})`, error);
    channel.nack(msg, false, !msg.fields.redelivered);
  }
});


module.exports = {
  timelineAddedHandler,
  timelineUpdatedHandler,
  timelineRemovedHandler,
};
