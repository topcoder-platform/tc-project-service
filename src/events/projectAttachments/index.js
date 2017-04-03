/**
 * Event handlers for project attachment create, update and delete
 * Current functionality just updates the elasticsearch indexes.
 */

import config from 'config';
import _ from 'lodash';
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
const projectAttachmentAddedHandler = (logger, msg, channel) => {
  const data = JSON.parse(msg.content.toString());

  eClient.get({
    index: ES_PROJECT_INDEX,
    type: ES_PROJECT_TYPE,
    id: data.projectId,
  }).then((doc) => {
    const attachments = _.isArray(doc._source.attachments) ? doc._source.attachments : [];    // eslint-disable-line no-underscore-dangle
    attachments.push(data);
    const merged = _.merge(doc._source, { attachments });       // eslint-disable-line no-underscore-dangle
    eClient.update({
      index: ES_PROJECT_INDEX,
      type: ES_PROJECT_TYPE,
      id: data.projectId,
      body: {
        doc: merged,
      },
    }).then(() => {
      logger.debug('project attachment added to project document successfully');
      channel.ack(msg);
    }).catch((error) => {
      logger.error('failed to add project attachment to project document', error);
      channel.nack(msg, false, !msg.fields.redelivered);
    });
  }).catch((error) => {
    logger.error('Error fetching project document from elasticsearch', error);
    // if the message has been redelivered dont attempt to reprocess it
    channel.nack(msg, false, !msg.fields.redelivered);
  });
};

/**
 * Handler for project attachment updated event
 * @param  {Object} logger  logger to log along with trace id
 * @param  {Object} msg     event payload
 * @param  {Object} channel channel to ack, nack
 * @returns {undefined}
 */
const projectAttachmentUpdatedHandler = (logger, msg, channel) => {
  const data = JSON.parse(msg.content.toString());

  eClient.get({
    index: ES_PROJECT_INDEX,
    type: ES_PROJECT_TYPE,
    id: data.original.projectId,
  }).then((doc) => {
    const attachments = _.map(doc._source.attachments, (single) => {   // eslint-disable-line no-underscore-dangle
      if (single.id === data.original.id) {
        return _.merge(single, data.updated);
      }
      return single;
    });
    const merged = _.merge(doc._source, { attachments });       // eslint-disable-line no-underscore-dangle
    eClient.update({
      index: ES_PROJECT_INDEX,
      type: ES_PROJECT_TYPE,
      id: data.original.projectId,
      body: {
        doc: merged,
      },
    }).then(() => {
      logger.debug('elasticsearch index updated, project attachment updated successfully');
      channel.ack(msg);
    }).catch((error) => {
      logger.error('failed to update project attachment for project document', error);
      channel.nack(msg, false, !msg.fields.redelivered);
    });
  }).catch((error) => {
    logger.error('Error fetching project document from elasticsearch', error);
    // if the message has been redelivered dont attempt to reprocess it
    channel.nack(msg, false, !msg.fields.redelivered);
  });
};

/**
 * Handler for project attachment deleted event
 * @param  {Object} logger  logger to log along with trace id
 * @param  {Object} msg     event payload
 * @param  {Object} channel channel to ack, nack
 * @returns {undefined}
 */
const projectAttachmentRemovedHandler = (logger, msg, channel) => {
  const data = JSON.parse(msg.content.toString());
  eClient.get({
    index: ES_PROJECT_INDEX,
    type: ES_PROJECT_TYPE,
    id: data.projectId,
  }).then((doc) => {
    const attachments = _.filter(doc._source.attachments, single => single.id !== data.id);     // eslint-disable-line no-underscore-dangle
    const merged = _.merge(doc._source, { attachments });       // eslint-disable-line no-underscore-dangle
    eClient.update({
      index: ES_PROJECT_INDEX,
      type: ES_PROJECT_TYPE,
      id: data.projectId,
      body: {
        doc: merged,
      },
    }).then(() => {
      logger.debug('project attachment removed from project document successfully');
      channel.ack(msg);
    }).catch((error) => {
      logger.error('failed to remove project attachment from project document', error);
      channel.nack(msg, false, !msg.fields.redelivered);
    });
  }).catch((error) => {
    logger.error('Error fetching project document from elasticsearch', error);
    // if the message has been redelivered dont attempt to reprocess it
    channel.nack(msg, false, !msg.fields.redelivered);
  });
};


module.exports = {
  projectAttachmentAddedHandler,
  projectAttachmentRemovedHandler,
  projectAttachmentUpdatedHandler,
};
