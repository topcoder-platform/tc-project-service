/**
 * Event handlers for project attachment create, update and delete
 * Current functionality just updates the elasticsearch indexes.
 */
import config from 'config';
import _ from 'lodash';
import elasticsearch from 'elasticsearch';
import { ELASTICSEARCH_INDICES, ELASTICSEARCH_INDICES_TYPES } from '../../constants';

// the client modifies the config object, so always passed the cloned object
const eClient = new elasticsearch.Client(_.cloneDeep(config.elasticsearchConfig));

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
    index: ELASTICSEARCH_INDICES.TC_PROJECT_SERVICE,
    type: ELASTICSEARCH_INDICES_TYPES.PROJECT,
    id: data.projectId,
  }).then((doc) => {
    const attachments = _.isArray(doc._source.attachments) ? doc._source.attachments : [];    // eslint-disable-line no-underscore-dangle
    attachments.push(data);
    const merged = _.merge(doc._source, { attachments });       // eslint-disable-line no-underscore-dangle
    eClient.update({
      index: ELASTICSEARCH_INDICES.TC_PROJECT_SERVICE,
      type: ELASTICSEARCH_INDICES_TYPES.PROJECT,
      id: data.projectId,
      body: {
        doc: merged,
      },
    }).then(() => channel.ack(msg)).catch((error) => {
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
    index: ELASTICSEARCH_INDICES.TC_PROJECT_SERVICE,
    type: ELASTICSEARCH_INDICES_TYPES.PROJECT,
    id: data.projectId,
  }).then((doc) => {
    const attachments = _.map(doc._source.attachments, (single) => {   // eslint-disable-line no-underscore-dangle
      if (single.id === data.original.id) {
        return _.merge(single, data.updated);
      }
      return single;
    });
    const merged = _.merge(doc._source, { attachments });       // eslint-disable-line no-underscore-dangle
    eClient.update({
      index: ELASTICSEARCH_INDICES.TC_PROJECT_SERVICE,
      type: ELASTICSEARCH_INDICES_TYPES.PROJECT,
      id: data.projectId,
      body: {
        doc: merged,
      },
    }).then(() => channel.ack(msg)).catch((error) => {
      logger.error('failed to remove project attachment from project document', error);
      channel.nack(msg, false, !msg.fields.redelivered);
    });
  }).catch((error) => {
    logger.error('Error fetching project document from elasticsearch', error);
    // if the message has been redelivered dont attempt to reprocess it
    channel.nack(msg, false, !msg.fields.redelivered);
  });

  channel.ack(msg);
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
    index: ELASTICSEARCH_INDICES.TC_PROJECT_SERVICE,
    type: ELASTICSEARCH_INDICES_TYPES.PROJECT,
    id: data.projectId,
  }).then((doc) => {
    const attachments = _.filter(doc._source.attachments, single => single.id !== data.id);     // eslint-disable-line no-underscore-dangle
    const merged = _.merge(doc._source, { attachments });       // eslint-disable-line no-underscore-dangle
    eClient.update({
      index: ELASTICSEARCH_INDICES.TC_PROJECT_SERVICE,
      type: ELASTICSEARCH_INDICES_TYPES.PROJECT,
      id: data.projectId,
      body: {
        doc: merged,
      },
    }).then(() => channel.ack(msg)).catch((error) => {
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
