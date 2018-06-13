/**
 * Event handlers for project phase create, update and delete.
 * Current functionality just updates the elasticsearch indexes.
 */

import config from 'config';
import _ from 'lodash';
import Promise from 'bluebird';
import util from '../../util';
import messageService from '../../services/messageService';

const ES_PROJECT_INDEX = config.get('elasticsearchConfig.indexName');
const ES_PROJECT_TYPE = config.get('elasticsearchConfig.docType');

const eClient = util.getElasticSearchClient();

/**
 * Indexes the project phase in the elastic search.
 *
 * @param  {Object} logger  logger to log along with trace id
 * @param  {Object} phase     event payload
 * @returns {undefined}
 */
const indexProjectPhase = Promise.coroutine(function* (logger, phase) { // eslint-disable-line func-names
  try {
    // const phase = JSON.parse(msg.content.toString());
    const doc = yield eClient.get({ index: ES_PROJECT_INDEX, type: ES_PROJECT_TYPE, id: phase.projectId });
    const phases = _.isArray(doc._source.phases) ? doc._source.phases : []; // eslint-disable-line no-underscore-dangle
    const existingPhaseIndex = _.findIndex(phases, p => p.id === phase.id);
    // if phase does not exists already
    if (existingPhaseIndex === -1) {
      phases.push(_.omit(phase, ['deletedAt', 'deletedBy']));
    } else { // if phase already exists, ideally we should never land here, but code handles the buggy indexing
      // replaces the old inconsistent index where previously phase was not removed from the index but deleted
      // from the database
      phases.splice(existingPhaseIndex, 1, phase);
    }
    const merged = _.assign(doc._source, { phases }); // eslint-disable-line no-underscore-dangle
    yield eClient.update({
      index: ES_PROJECT_INDEX,
      type: ES_PROJECT_TYPE,
      id: phase.projectId,
      body: { doc: merged },
    });
    logger.debug('project phase added to project document successfully');
  } catch (error) {
    logger.error('Error handling indexing the project phase', error);
    // throw the error back to nack the bus
    throw error;
  }
});

/**
 * Creates a new phase topic in message api.
 *
 * @param  {Object} logger  logger to log along with trace id
 * @param  {Object} msg     event payload
 * @returns {undefined}
 */
const createPhaseTopic = Promise.coroutine(function* (logger, phase) { // eslint-disable-line func-names
  try {
    logger.debug('Creating topic for phase with phase', phase);
    const topic = yield messageService.createTopic({
      reference: 'project',
      referenceId: `${phase.projectId}`,
      tag: `phase#${phase.id}`,
      title: phase.name,
      body: 'Welcome!!! Please use this channel for communication around the phase.',
    }, logger);
    logger.debug('topic for the phase created successfully');
    logger.debug('created topic', topic);
  } catch (error) {
    logger.error('Error in creating topic for the project phase', error);
    // don't throw the error back to nack the bus, because we don't want to get multiple topics per phase
    // we can create topic for a phase manually, if somehow it fails
  }
});

/**
 * Handler for project phase creation event
 * @param  {Object} logger  logger to log along with trace id
 * @param  {Object} msg     event payload
 * @param  {Object} channel channel to ack, nack
 * @returns {undefined}
 */
const projectPhaseAddedHandler = Promise.coroutine(function* (logger, msg, channel) { // eslint-disable-line func-names
  const phase = JSON.parse(msg.content.toString());
  try {
    logger.debug('calling indexProjectPhase', phase);
    yield indexProjectPhase(logger, phase, channel);
    logger.debug('calling createPhaseTopic', phase);
    yield createPhaseTopic(logger, phase);
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
 * Removes the project phase from the elastic search.
 *
 * @param  {Object} logger  logger to log along with trace id
 * @param  {Object} msg     event payload
 * @returns {undefined}
 */
const removePhaseFromIndex = Promise.coroutine(function* (logger, msg) { // eslint-disable-line func-names
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
  } catch (error) {
    logger.error('Error in removing project phase from index', error);
    // throw the error back to nack the bus
    throw error;
  }
});

/**
 * Removes the phase topic from the message api.
 *
 * @param  {Object} logger  logger to log along with trace id
 * @param  {Object} msg     event payload
 * @returns {undefined}
 */
const removePhaseTopic = Promise.coroutine(function* (logger, msg) { // eslint-disable-line func-names
  try {
    const phase = JSON.parse(msg.content.toString());
    const phaseTopic = yield messageService.getPhaseTopic(phase.projectId, phase.id, logger);
    yield messageService.deletePosts(phaseTopic.id, phaseTopic.postIds, logger);
    yield messageService.deleteTopic(phaseTopic.id, logger);
    logger.debug('topic for the phase removed successfully');
  } catch (error) {
    logger.error('Error in removing topic for the project phase', error);
    // don't throw the error back to nack the bus
    // we can delete topic for a phase manually, if somehow it fails
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
    yield removePhaseFromIndex(logger, msg, channel);
    yield removePhaseTopic(logger, msg);
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
  createPhaseTopic,
};
