/**
 * Event handlers for project attachment create, update and delete
 * Current functionality just updates the elasticsearch indexes.
 */

import config from 'config';
import _ from 'lodash';
import Promise from 'bluebird';
import util from '../../util';

const ES_PROJECT_INDEX = config.get('elasticsearchConfig.indexName');
const ES_PROJECT_TYPE = config.get('elasticsearchConfig.docType');

const eClient = util.getElasticSearchClient();

/**
 * Handler for project attachment creation event
 * @param  {Object} logger  logger to log along with trace id
 * @param  {Object} msg     event payload
 * @param  {Object} channel channel to ack, nack
 * @returns {undefined}
 */
const projectAttachmentAddedHandler = Promise.coroutine(function* (logger, msg, channel) { // eslint-disable-line func-names
  try {
    const data = JSON.parse(msg.content.toString());
    const doc = yield eClient.get({ index: ES_PROJECT_INDEX, type: ES_PROJECT_TYPE, id: data.projectId });
    const attachments = _.isArray(doc._source.attachments) ? doc._source.attachments : [];    // eslint-disable-line no-underscore-dangle
    attachments.push(data);
    const merged = _.merge(doc._source, { attachments });       // eslint-disable-line no-underscore-dangle
    yield eClient.update({ index: ES_PROJECT_INDEX, type: ES_PROJECT_TYPE, id: data.projectId, body: { doc: merged } });
    logger.debug('project attachment added to project document successfully');
    channel.ack(msg);
  } catch (error) {
    logger.error('Error handling project.attachment.added event', error);
    // if the message has been redelivered dont attempt to reprocess it
    channel.nack(msg, false, !msg.fields.redelivered);
  }
});

/**
 * Handler for project attachment updated event
 * @param  {Object} logger  logger to log along with trace id
 * @param  {Object} msg     event payload
 * @param  {Object} channel channel to ack, nack
 * @returns {undefined}
 */
const projectAttachmentUpdatedHandler = Promise.coroutine(function* (logger, msg, channel) { // eslint-disable-line func-names
  try {
    const data = JSON.parse(msg.content.toString());
    const doc = yield eClient.get({ index: ES_PROJECT_INDEX, type: ES_PROJECT_TYPE, id: data.original.projectId });
    const attachments = _.map(doc._source.attachments, (single) => {   // eslint-disable-line no-underscore-dangle
      if (single.id === data.original.id) {
        return _.merge(single, data.updated);
      }
      return single;
    });
    const merged = _.merge(doc._source, { attachments });       // eslint-disable-line no-underscore-dangle
    yield eClient.update({
      index: ES_PROJECT_INDEX,
      type: ES_PROJECT_TYPE,
      id: data.original.projectId,
      body: {
        doc: merged,
      },
    });
    logger.debug('elasticsearch index updated, project attachment updated successfully');
    channel.ack(msg);
  } catch (error) {
    logger.error('Error handling project.attachment.updated event', error);
    // if the message has been redelivered dont attempt to reprocess it
    channel.nack(msg, false, !msg.fields.redelivered);
  }
});

/**
 * Handler for project attachment deleted event
 * @param  {Object} logger  logger to log along with trace id
 * @param  {Object} msg     event payload
 * @param  {Object} channel channel to ack, nack
 * @returns {undefined}
 */
const projectAttachmentRemovedHandler = Promise.coroutine(function* (logger, msg, channel) { // eslint-disable-line func-names
  try {
    const data = JSON.parse(msg.content.toString());
    const doc = yield eClient.get({ index: ES_PROJECT_INDEX, type: ES_PROJECT_TYPE, id: data.projectId });
    const attachments = _.filter(doc._source.attachments, single => single.id !== data.id);     // eslint-disable-line no-underscore-dangle
    const merged = _.merge(doc._source, { attachments });       // eslint-disable-line no-underscore-dangle
    yield eClient.update({
      index: ES_PROJECT_INDEX,
      type: ES_PROJECT_TYPE,
      id: data.projectId,
      body: {
        doc: merged,
      },
    });
    logger.debug('project attachment removed from project document successfully');
    channel.ack(msg);
  } catch (error) {
    logger.error('Error fetching project document from elasticsearch', error);
    // if the message has been redelivered dont attempt to reprocess it
    channel.nack(msg, false, !msg.fields.redelivered);
  }
});


module.exports = {
  projectAttachmentAddedHandler,
  projectAttachmentRemovedHandler,
  projectAttachmentUpdatedHandler,
};
