/**
 * Event handlers for project create, update and delete
 */
import _ from 'lodash';
import Joi from 'joi';
import Promise from 'bluebird';
import { createPhaseTopic } from '../projectPhases';
import { PROJECT_STATUS, REGEX, TIMELINE_REFERENCES } from '../../constants';

/**
 * Payload for new unified BUS events like `project.action.created` with `resource=project`
 */
const projectPayloadSchema = Joi.object().keys({
  id: Joi.number().integer().positive().required(),
  createdAt: Joi.date().required(),
  updatedAt: Joi.date().required(),
  terms: Joi.array().items(Joi.string()).optional(),
  groups: Joi.array().items(Joi.string()).optional(),
  name: Joi.string().required(),
  description: Joi.string().allow(null).allow('').optional(),
  type: Joi.string().max(45).required(),
  createdBy: Joi.number().integer().positive().required(), // userId
  updatedBy: Joi.number().integer().required(), // userId - can be negative for M2M tokens
  challengeEligibility: Joi.array().items(Joi.object().keys({
    role: Joi.string().valid('submitter', 'reviewer', 'copilot'),
    users: Joi.array().items(Joi.number().positive()),
    groups: Joi.array().items(Joi.number().positive()),
  })).allow(null),
  bookmarks: Joi.array().items(Joi.object().keys({
    title: Joi.string(),
    address: Joi.string().regex(REGEX.URL),
    createdAt: Joi.date(),
    createdBy: Joi.number().integer().positive(),
    updatedAt: Joi.date(),
    updatedBy: Joi.number().integer().positive(),
  })).optional().allow(null),
  external: Joi.object().keys({
    id: Joi.string(),
    type: Joi.any().valid('github', 'jira', 'asana', 'other'),
    data: Joi.string().max(300), // TODO - restrict length
  }).allow(null),
  status: Joi.string().required(),
  lastActivityAt: Joi.date().required(),
  lastActivityUserId: Joi.string().required(), // user handle
  version: Joi.string(),
  directProjectId: Joi.number().positive().allow(null),
  billingAccountId: Joi.number().positive().allow(null),
  utm: Joi.object().keys({
    source: Joi.string().allow(null),
    medium: Joi.string().allow(null),
    campaign: Joi.string().allow(null),
  }).allow(null),
  estimatedPrice: Joi.number().precision(2).positive().optional()
    .allow(null),
  details: Joi.any(),
  templateId: Joi.number().integer().positive().allow(null),
  estimation: Joi.array().items(Joi.object().keys({
    conditions: Joi.string().required(),
    price: Joi.number().required(),
    quantity: Joi.number().optional(),
    minTime: Joi.number().integer().required(),
    maxTime: Joi.number().integer().required(),
    buildingBlockKey: Joi.string().required(),
    metadata: Joi.object().optional(),
  })).optional(),
  // cancel reason is mandatory when project status is cancelled
  cancelReason: Joi.when('status', {
    is: PROJECT_STATUS.CANCELLED,
    then: Joi.string().required(),
    otherwise: Joi.string().optional().allow(null),
  }),
}).unknown(true).required();

/**
 * Project Created BUS API event handler.
 * - creates topics for the phases of the newly created project
 * - throws exceptions in case of error
 *
 * @param   {Object}  app       Application object
 * @param   {String}  topic     Kafka topic
 * @param   {Object}  payload   Message payload
 * @return  {Promise} Promise
 */
async function projectCreatedKafkaHandler(app, topic, payload) {
  // Validate payload
  const result = Joi.validate(payload, projectPayloadSchema);
  if (result.error) {
    throw new Error(result.error);
  }
  const project = payload;

  if (project.phases && project.phases.length > 0) {
    app.logger.debug('Phases found for the project, trying to create topics for each phase.');
    const topicPromises = _.map(
      project.phases,
      phase => createPhaseTopic(app.logger, phase, TIMELINE_REFERENCES.PHASE),
    );
    await Promise.all(topicPromises);
    app.logger.debug('Topics for phases are successfully created.');
  }
}

module.exports = {
  projectCreatedKafkaHandler,
};
