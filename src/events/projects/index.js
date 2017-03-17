/**
 * Event handlers for project create, update and delete
 * Current functionality just updates the elasticsearch indexes.
 */
import config from 'config';
import _ from 'lodash';
import elasticsearch from 'elasticsearch';
import { ELASTICSEARCH_INDICES, ELASTICSEARCH_INDICES_TYPES } from '../../constants';

// the client modifies the config object, so always passed the cloned object
const eClient = new elasticsearch.Client(_.cloneDeep(config.elasticsearchConfig));

/**
 * Handler for project creation event
 * @param  {Object} logger  logger to log along with trace id
 * @param  {Object} msg     event payload
 * @param  {Object} channel channel to ack, nack
 * @returns {undefined}
 */
const projectCreatedHandler = (logger, msg, channel) => {
  const data = JSON.parse(msg.content.toString());
  eClient.create({
    index: ELASTICSEARCH_INDICES.TC_PROJECT_SERVICE,
    type: ELASTICSEARCH_INDICES_TYPES.PROJECT,
    id: data.id,
    body: _.omit(data, 'id'),
  }).then((resp) => {
    logger.info('project indexed successfully', resp);
    channel.ack(msg);
  }).catch((error) => {
    logger.error('failed to index project', error);
    channel.nack(msg, false, !msg.fields.redelivered);
  });
};

/**
 * Handler for project updated event
 * @param  {Object} logger  logger to log along with trace id
 * @param  {Object} msg     event payload
 * @param  {Object} channel channel to ack, nack
 * @returns {undefined}
 */
const projectUpdatedHandler = (logger, msg, channel) => {
  const data = JSON.parse(msg.content.toString());

  // first get the existing document and than merge the updated changes and save the new document
  eClient.get({
    index: ELASTICSEARCH_INDICES.TC_PROJECT_SERVICE,
    type: ELASTICSEARCH_INDICES_TYPES.PROJECT,
    id: data.original.id,
  }).then((doc) => {
    // merge the document with updated props and omit id
    const merged = _.merge(doc._source, _.omit(data.updated, 'id'));        // eslint-disable-line no-underscore-dangle
    // update the merged document
    eClient.update({
      index: ELASTICSEARCH_INDICES.TC_PROJECT_SERVICE,
      type: ELASTICSEARCH_INDICES_TYPES.PROJECT,
      id: data.original.id,
      body: {
        doc: merged,
      },
    }).then(() => channel.ack(msg)).catch((error) => {
      logger.error('failed to update project document', error);
      channel.nack(msg, false, !msg.fields.redelivered);
    });
  }).catch((error) => {
    logger.error('failed to get project document', error);
    channel.nack(msg, false, !msg.fields.redelivered);
  });
};

/**
 * Handler for project deleted event
 * @param  {Object} logger  logger to log along with trace id
 * @param  {Object} msg     event payload
 * @param  {Object} channel channel to ack, nack
 * @returns {undefined}
 */
const projectDeletedHandler = (logger, msg, channel) => {
  const data = JSON.parse(msg.content.toString());
  eClient.delete({
    index: ELASTICSEARCH_INDICES.TC_PROJECT_SERVICE,
    type: ELASTICSEARCH_INDICES_TYPES.PROJECT,
    id: data.id,
  }).then(() => {
    channel.ack(msg);
  }).catch((error) => {
    logger.error('failed to delete project document', error);
    channel.nack(msg, false, !msg.fields.redelivered);
  });
};


module.exports = {
  projectCreatedHandler,
  projectUpdatedHandler,
  projectDeletedHandler,
};
