/**
 * Event handlers for project phase create, update and delete.
 * Current functionality just updates the elasticsearch indexes.
 */

import Joi from 'joi';
import _ from 'lodash';
import Promise from 'bluebird';
import { TIMELINE_REFERENCES } from '../../constants';

import messageService from '../../services/messageService';

/**
 * Build topics data based on route parameter.
 *
 * @param  {Object} logger  logger to log along with trace id
 * @param  {Object} phase   phase object
 * @param  {String} route   route value can be PHASE/WORK
 * @returns {undefined}
 */
const buildTopicsData = (logger, phase, route) => {
  if (route === TIMELINE_REFERENCES.WORK) {
    return [{
      tag: `work#${phase.id}-details`,
      title: `${phase.name} - Details`,
      reference: 'project',
      referenceId: `${phase.projectId}`,
      body: 'This is the beginning of your phase discussion. During execution of this phase, all related communication will be conducted here - phase updates, questions and answers, suggestions, etc. If you haven\'t already, do please take a moment to review the form in the Specification tab above and fill in as much detail as possible. This will help get started faster. Thanks!', // eslint-disable-line
    }, {
      tag: `work#${phase.id}-requirements`,
      title: `${phase.name} - Requirements`,
      reference: 'project',
      referenceId: `${phase.projectId}`,
      body: 'This is the beginning of your phase discussion. During execution of this phase, all related communication will be conducted here - phase updates, questions and answers, suggestions, etc. If you haven\'t already, do please take a moment to review the form in the Specification tab above and fill in as much detail as possible. This will help get started faster. Thanks!', // eslint-disable-line
    }];
  }
  return [{
    tag: `phase#${phase.id}`,
    title: phase.name,
    reference: 'project',
    referenceId: `${phase.projectId}`,
    body: 'This is the beginning of your phase discussion. During execution of this phase, all related communication will be conducted here - phase updates, questions and answers, suggestions, etc. If you haven\'t already, do please take a moment to review the form in the Specification tab above and fill in as much detail as possible. This will help get started faster. Thanks!', // eslint-disable-line
  }];
};

/**
 * Creates topics in message api
 *
 * @param  {Object} logger  logger to log along with trace id
 * @param  {Object} phase   phase object
 * @param  {String} route   route value can be `phase`/`work`
 * @returns {undefined}
 */
const createTopics = Promise.coroutine(function* (logger, phase, route) { // eslint-disable-line func-names
  try {
    logger.debug(`Creating topics for ${route} with phase`, phase);
    const topicsData = buildTopicsData(logger, phase, route);
    const topics = yield Promise.all(_.map(topicsData, topicData => messageService.createTopic(topicData, logger)));
    logger.debug(`topics for the ${route} created successfully`);
    logger.debug('created topics', topics);
  } catch (error) {
    logger.error(`Error in creating topic for ${route}`, error);
    // don't throw the error back to nack the bus, because we don't want to get multiple topics per phase
    // we can create topic for a phase manually, if somehow it fails
  }
});

/**
 * Update one topic
 *
 * @param  {Object} logger       logger to log along with trace id
 * @param  {Object} phase        phase object
 * @param  {Object} topicUpdate  updated topic data
 * @returns {undefined}
 */
const updateOneTopic = Promise.coroutine(function* (logger, phase, topicUpdate) { // eslint-disable-line func-names
  const topic = yield messageService.getTopicByTag(phase.projectId, topicUpdate.tag, logger);
  logger.trace('Topic', topic);
  const title = topicUpdate.title;
  const titleChanged = topic && topic.title !== title;
  logger.trace('titleChanged', titleChanged);
  const contentPost = topic && topic.posts && topic.posts.length > 0 ? topic.posts[0] : null;
  logger.trace('contentPost', contentPost);
  const postId = _.get(contentPost, 'id');
  const content = _.get(contentPost, 'body');
  if (postId && content && titleChanged) {
    const updatedTopic = yield messageService.updateTopic(topic.id, { title, postId, content }, logger);
    logger.debug('topic updated successfully');
    logger.trace('updated topic', updatedTopic);
  }
});

/**
 * Update topics in message api.
 *
 * @param  {Object} logger  logger to log along with trace id
 * @param  {Object} phase   phase object
 * @param  {String} route   route value can be `phase`/`work`
 * @returns {undefined}
 */
const updateTopics = Promise.coroutine(function* (logger, phase, route) { // eslint-disable-line func-names
  try {
    logger.debug(`Updating topic for ${route} with phase`, phase);
    const topicsData = buildTopicsData(logger, phase, route);
    yield Promise.all(_.map(topicsData, topicData => updateOneTopic(logger, phase, topicData)));
    logger.debug(`topics for the ${route} updated successfully`);
  } catch (error) {
    logger.error(`Error in updating topic for ${route}`, error);
    // don't throw the error back to nack the bus, because we don't want to get multiple topics per phase
    // we can create topic for a phase manually, if somehow it fails
  }
});

/**
 * Removes one topic from the message api.
 *
 * @param  {Object} logger logger to log along with trace id
 * @param  {Object} phase  phase object
 * @param  {Object} tag    topic tag
 * @returns {undefined}
 */
const removeOneTopic = Promise.coroutine(function* (logger, phase, tag) { // eslint-disable-line func-names
  try {
    const phaseTopic = yield messageService.getTopicByTag(phase.projectId, tag, logger);
    yield messageService.deletePosts(phaseTopic.id, phaseTopic.postIds, logger);
    yield messageService.deleteTopic(phaseTopic.id, logger);
  } catch (error) {
    logger.error(`Error removing topic by tab ${tag}`, error);
    // don't throw the error back to nack the bus
    // we can delete topic for a phase manually, if somehow it fails
  }
});

/**
 * Remove topics in message api.
 *
 * @param  {Object} logger  logger to log along with trace id
 * @param  {Object} phase   phase object
 * @param  {String} route   route value can be `phase`/`work`
 * @returns {undefined}
 */
const removeTopics = Promise.coroutine(function* (logger, phase, route) { // eslint-disable-line func-names
  try {
    logger.debug(`Removing topic for ${route} with phase`, phase);
    const topicsData = buildTopicsData(logger, phase, route);
    yield Promise.all(_.map(topicsData, topicData => removeOneTopic(logger, phase, topicData.tag)));
    logger.debug(`topics for the ${route} removed successfully`);
  } catch (error) {
    logger.error(`Error in removing topic for ${route}`, error);
    // don't throw the error back to nack the bus, because we don't want to get multiple topics per phase
    // we can create topic for a phase manually, if somehow it fails
  }
});

/**
 * Payload for new unified BUS events like `project.action.created` with `resource=phase`
 */
const phasePayloadScheme = Joi.object().keys({
  id: Joi.number().integer().positive().required(),
  projectId: Joi.number().integer().positive().required(),
  name: Joi.string().required(),
  status: Joi.string().required(),
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional(),
  duration: Joi.number().min(0).optional().allow(null),
  budget: Joi.number().min(0).optional(),
  spentBudget: Joi.number().min(0).optional(),
  progress: Joi.number().min(0).optional(),
  details: Joi.any().optional(),
  order: Joi.number().integer().optional().allow(null),
}).unknown(true).required();

/**
 * Phase Created BUS API event handler.
 * - create phase's Topic
 * - throws exceptions in case of error
 *
 * @param   {Object}  app       Application object
 * @param   {String}  topic     Kafka topic
 * @param   {Object}  payload   Message payload
 * @return  {Promise} Promise
 */
async function projectPhaseAddedKafkaHandler(app, topic, payload) {
  // Validate payload
  const result = Joi.validate(payload, phasePayloadScheme);
  if (result.error) {
    throw new Error(result.error);
  }

  const phase = payload;
  app.logger.debug('calling createPhaseTopic', phase);
  await createTopics(app.logger, phase, TIMELINE_REFERENCES.PHASE);
}

/**
 * Phase Updated BUS API event handler.
 * - updates phase's Topic
 * - throws exceptions in case of error
 *
 * @param   {Object}  app       Application object
 * @param   {String}  topic     Kafka topic
 * @param   {Object}  payload   Message payload
 * @return  {Promise} Promise
 */
async function projectPhaseUpdatedKafkaHandler(app, topic, payload) {
  // Validate payload
  const result = Joi.validate(payload, phasePayloadScheme);
  if (result.error) {
    throw new Error(result.error);
  }

  const phase = payload;
  app.logger.debug('calling updateTopics', phase);
  await updateTopics(app.logger, phase, TIMELINE_REFERENCES.PHASE);
}

/**
 * Phase Deleted BUS API event handler.
 * - removes phase's Topic
 * - throws exceptions in case of error
 *
 * @param   {Object}  app       Application object
 * @param   {String}  topic     Kafka topic
 * @param   {Object}  payload   Message payload
 * @return  {Promise} Promise
 */
async function projectPhaseRemovedKafkaHandler(app, topic, payload) {
  // Validate payload
  const result = Joi.validate(payload, phasePayloadScheme);
  if (result.error) {
    throw new Error(result.error);
  }

  const phase = payload;
  app.logger.debug('calling removeTopics', phase);
  await removeTopics(app.logger, phase, TIMELINE_REFERENCES.PHASE);
}

module.exports = {
  createPhaseTopic: createTopics,
  projectPhaseAddedKafkaHandler,
  projectPhaseUpdatedKafkaHandler,
  projectPhaseRemovedKafkaHandler,
};
