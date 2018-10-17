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
      // Increase the order of the other phases in the same project,
      // which have `order` >= this phase order
      _.each(phases, (_phase) => {
        if (!_.isNil(_phase.order) && !_.isNil(phase.order) && _phase.order >= phase.order) {
          _phase.order += 1; // eslint-disable-line no-param-reassign
        }
      });

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
      body: 'This is the beginning of your phase discussion. During execution of this phase, all related communication will be conducted here - phase updates, questions and answers, suggestions, etc. If you haven\'t already, do please take a moment to review the form in the Specification tab above and fill in as much detail as possible. This will help get started faster. Thanks!', // eslint-disable-line
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
 * Indexes the project phase in the elastic search.
 *
 * @param  {Object} logger  logger to log along with trace id
 * @param  {Object} data     event payload
 * @returns {undefined}
 */
const updateIndexProjectPhase = Promise.coroutine(function* (logger, data) { // eslint-disable-line func-names
  try {
    const doc = yield eClient.get({ index: ES_PROJECT_INDEX, type: ES_PROJECT_TYPE, id: data.original.projectId });
    const phases = _.map(data.allPhases, single => _.omit(single, ['deletedAt', 'deletedBy']));
    const merged = _.assign(doc._source, { phases }); // eslint-disable-line no-underscore-dangle
    yield eClient.update({
      index: ES_PROJECT_INDEX,
      type: ES_PROJECT_TYPE,
      id: data.original.projectId,
      body: {
        doc: merged,
      },
    });
    logger.debug('project phase updated to project document successfully');
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
const updatePhaseTopic = Promise.coroutine(function* (logger, phase) { // eslint-disable-line func-names
  try {
    logger.debug('Updating topic for phase with phase', phase);
    const topic = yield messageService.getPhaseTopic(phase.projectId, phase.id, logger);
    logger.trace('Topic', topic);
    const title = phase.name;
    const titleChanged = topic && topic.title !== title;
    logger.trace('titleChanged', titleChanged);
    const contentPost = topic && topic.posts && topic.posts.length > 0 ? topic.posts[0] : null;
    logger.trace('contentPost', contentPost);
    const postId = _.get(contentPost, 'id');
    const content = _.get(contentPost, 'body');
    if (postId && content && titleChanged) {
      const updatedTopic = yield messageService.updateTopic(topic.id, { title, postId, content }, logger);
      logger.debug('topic for the phase updated successfully');
      logger.trace('updated topic', updatedTopic);
    }
  } catch (error) {
    logger.error('Error in updating topic for the project phase', error);
    // don't throw the error back to nack the bus, because we don't want to get multiple topics per phase
    // we can create topic for a phase manually, if somehow it fails
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
    logger.debug('calling updateIndexProjectPhase', data);
    yield updateIndexProjectPhase(logger, data, channel);
    logger.debug('calling updatePhaseTopic', data.updated);
    yield updatePhaseTopic(logger, data.updated);
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
