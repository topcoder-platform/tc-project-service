/**
 * Event handlers for project phase create, update and delete.
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
 * Handler for project phase creation event
 * @param  {Object} logger  logger to log along with trace id
 * @param  {Object} msg     event payload
 * @param  {Object} channel channel to ack, nack
 * @returns {undefined}
 */
const projectPhaseAddedHandler = Promise.coroutine(function* (logger, msg, channel) { // eslint-disable-line func-names
  try {
    const data = JSON.parse(msg.content.toString());
    const doc = yield eClient.get({ index: ES_PROJECT_INDEX, type: ES_PROJECT_TYPE, id: data.projectId });
    const phases = _.isArray(doc._source.phases) ? doc._source.phases : []; // eslint-disable-line no-underscore-dangle
    phases.push(_.omit(data, ['deletedAt', 'deletedBy']));
    const merged = _.assign(doc._source, { phases }); // eslint-disable-line no-underscore-dangle
    yield eClient.update({ index: ES_PROJECT_INDEX, type: ES_PROJECT_TYPE, id: data.projectId, body: { doc: merged } });
    logger.debug('project phase added to project document successfully');
    channel.ack(msg);
  } catch (error) {
    logger.error('Error handling project.phase.added event', error);
    // if the message has been redelivered dont attempt to reprocess it
    channel.nack(msg, false, !msg.fields.redelivered);
  }
});

/**
 * Handler for project phase updated event
 * @param  {Object} logger  logger to log along with trace id
 * @param  {Object} msg     event payload
 * @param  {Object} channel channel to ack, nack
 * @returns {undefined}
 */
const projectPhaseUpdatedHandler = Promise.coroutine(function* (logger, msg, channel) { // eslint-disable-line func-names
  try {
    const data = JSON.parse(msg.content.toString());
    const doc = yield eClient.get({ index: ES_PROJECT_INDEX, type: ES_PROJECT_TYPE, id: data.original.projectId });
    const phases = _.map(doc._source.phases, (single) => { // eslint-disable-line no-underscore-dangle
      if (single.id === data.original.id) {
        return _.assign(single, _.omit(data.updated, ['deletedAt', 'deletedBy']));
      }
      return single;
    });
    const merged = _.assign(doc._source, { phases }); // eslint-disable-line no-underscore-dangle
    yield eClient.update({
      index: ES_PROJECT_INDEX,
      type: ES_PROJECT_TYPE,
      id: data.original.projectId,
      body: {
        doc: merged,
      },
    });
    logger.debug('elasticsearch index updated, project phase updated successfully');
    channel.ack(msg);
  } catch (error) {
    logger.error('Error handling project.phase.updated event', error);
    // if the message has been redelivered dont attempt to reprocess it
    channel.nack(msg, false, !msg.fields.redelivered);
  }
});

/**
 * Handler for project phase deleted event
 * @param  {Object} logger  logger to log along with trace id
 * @param  {Object} msg     event payload
 * @param  {Object} channel channel to ack, nack
 * @returns {undefined}
 */
const projectPhaseRemovedHandler = Promise.coroutine(function* (logger, msg, channel) { // eslint-disable-line func-names
  try {
    const data = JSON.parse(msg.content.toString());
    const doc = yield eClient.get({ index: ES_PROJECT_INDEX, type: ES_PROJECT_TYPE, id: data.projectId });
    const phases = _.filter(doc._source.phases, single => single.id !== data.id); // eslint-disable-line no-underscore-dangle
    const merged = _.assign(doc._source, { phases });       // eslint-disable-line no-underscore-dangle
    yield eClient.update({
      index: ES_PROJECT_INDEX,
      type: ES_PROJECT_TYPE,
      id: data.projectId,
      body: {
        doc: merged,
      },
    });
    logger.debug('project phase removed from project document successfully');
    channel.ack(msg);
  } catch (error) {
    logger.error('Error fetching project document from elasticsearch', error);
    // if the message has been redelivered dont attempt to reprocess it
    channel.nack(msg, false, !msg.fields.redelivered);
  }
});


module.exports = {
  projectPhaseAddedHandler,
  projectPhaseRemovedHandler,
  projectPhaseUpdatedHandler,
};
