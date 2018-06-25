/**
 * Event handlers for phase product create, update and delete.
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
 * Handler for phase product creation event
 * @param  {Object} logger  logger to log along with trace id
 * @param  {Object} msg     event payload
 * @param  {Object} channel channel to ack, nack
 * @returns {undefined}
 */
const phaseProductAddedHandler = Promise.coroutine(function* (logger, msg, channel) { // eslint-disable-line func-names
  try {
    const data = JSON.parse(msg.content.toString());
    const doc = yield eClient.get({ index: ES_PROJECT_INDEX, type: ES_PROJECT_TYPE, id: data.projectId });
    const phases = _.isArray(doc._source.phases) ? doc._source.phases : [];    // eslint-disable-line no-underscore-dangle

    _.each(phases, (phase) => {
      if (phase.id === data.phaseId) {
        phase.products = _.isArray(phase.products) ? phase.products : []; // eslint-disable-line no-param-reassign
        phase.products.push(_.omit(data, ['deletedAt', 'deletedBy']));
      }
    });

    const merged = _.assign(doc._source, { phases });       // eslint-disable-line no-underscore-dangle
    yield eClient.update({ index: ES_PROJECT_INDEX, type: ES_PROJECT_TYPE, id: data.projectId, body: { doc: merged } });
    logger.debug('phase product added to project document successfully');
    channel.ack(msg);
  } catch (error) {
    logger.error('Error handling project.phase.added event', error);
    // if the message has been redelivered dont attempt to reprocess it
    channel.nack(msg, false, !msg.fields.redelivered);
  }
});

/**
 * Handler for phase product updated event
 * @param  {Object} logger  logger to log along with trace id
 * @param  {Object} msg     event payload
 * @param  {Object} channel channel to ack, nack
 * @returns {undefined}
 */
const phaseProductUpdatedHandler = Promise.coroutine(function* (logger, msg, channel) { // eslint-disable-line func-names
  try {
    const data = JSON.parse(msg.content.toString());
    const doc = yield eClient.get({ index: ES_PROJECT_INDEX, type: ES_PROJECT_TYPE, id: data.original.projectId });
    const phases = _.map(doc._source.phases, (phase) => {   // eslint-disable-line no-underscore-dangle
      if (phase.id === data.original.phaseId) {
        phase.products = _.map(phase.products, (product) => { // eslint-disable-line no-param-reassign
          if (product.id === data.original.id) {
            return _.assign(product, _.omit(data.updated, ['deletedAt', 'deletedBy']));
          }
          return product;
        });
      }
      return phase;
    });
    const merged = _.assign(doc._source, { phases });       // eslint-disable-line no-underscore-dangle
    yield eClient.update({
      index: ES_PROJECT_INDEX,
      type: ES_PROJECT_TYPE,
      id: data.original.projectId,
      body: {
        doc: merged,
      },
    });
    logger.debug('elasticsearch index updated, phase product updated successfully');
    channel.ack(msg);
  } catch (error) {
    logger.error('Error handling project.phase.updated event', error);
    // if the message has been redelivered dont attempt to reprocess it
    channel.nack(msg, false, !msg.fields.redelivered);
  }
});

/**
 * Handler for phase product deleted event
 * @param  {Object} logger  logger to log along with trace id
 * @param  {Object} msg     event payload
 * @param  {Object} channel channel to ack, nack
 * @returns {undefined}
 */
const phaseProductRemovedHandler = Promise.coroutine(function* (logger, msg, channel) { // eslint-disable-line func-names
  try {
    const data = JSON.parse(msg.content.toString());
    const doc = yield eClient.get({ index: ES_PROJECT_INDEX, type: ES_PROJECT_TYPE, id: data.projectId });
    const phases = _.map(doc._source.phases, (phase) => {   // eslint-disable-line no-underscore-dangle
      if (phase.id === data.phaseId) {
        phase.products = _.filter(phase.products, product => product.id !== data.id); // eslint-disable-line no-param-reassign
      }
      return phase;
    });

    const merged = _.assign(doc._source, { phases });       // eslint-disable-line no-underscore-dangle

    yield eClient.update({
      index: ES_PROJECT_INDEX,
      type: ES_PROJECT_TYPE,
      id: data.projectId,
      body: {
        doc: merged,
      },
    });
    logger.debug('phase product removed from project document successfully');
    channel.ack(msg);
  } catch (error) {
    logger.error('Error fetching project document from elasticsearch', error);
    // if the message has been redelivered dont attempt to reprocess it
    channel.nack(msg, false, !msg.fields.redelivered);
  }
});


module.exports = {
  phaseProductAddedHandler,
  phaseProductRemovedHandler,
  phaseProductUpdatedHandler,
};
