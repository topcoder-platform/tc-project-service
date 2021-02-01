/**
 * Event handlers for project create, update and delete
 */
import _ from 'lodash';
import Joi from 'joi';
import Promise from 'bluebird';
import config from 'config';
import axios from 'axios';
import util from '../../util';
import models from '../../models';
import { createPhaseTopic } from '../projectPhases';
import { PROJECT_STATUS, REGEX, TIMELINE_REFERENCES } from '../../constants';

const ES_PROJECT_INDEX = config.get('elasticsearchConfig.indexName');
const ES_PROJECT_TYPE = config.get('elasticsearchConfig.docType');
const eClient = util.getElasticSearchClient();

/**
  * creates taas job
  * @param {Object} data the job data
  * @return {Object} the job created
  */
const createTaasJob = async (data) => {
  const token = await util.getM2MToken();
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
  const res = await axios
    .post(config.taasJobApiUrl, data, { headers })
    .catch((err) => {
      const error = new Error();
      error.message = _.get(err, 'response.data.message', error.message);
      throw error;
    });
  return res.data;
};

/**
 * Payload for deprecated BUS events like `connect.notification.project.updated`.
 */
const projectUpdatedPayloadSchema = Joi.object().keys({
  projectId: Joi.number().integer().positive().required(),
  projectName: Joi.string().optional(),
  projectUrl: Joi.string().regex(REGEX.URL).optional(),
  userId: Joi.number().integer().positive().required(),
  initiatorUserId: Joi.number().integer().positive().required(),
}).unknown(true).required();

/**
 * Updates project activity fields. throws exceptions in case of error
 * @param   {Object}  app       Application object used to interact with RMQ service
 * @param   {String}  topic     Kafka topic
 * @param   {Object}  payload   Message payload
 * @return  {Promise} Promise
 */
async function projectUpdatedKafkaHandler(app, topic, payload) {
  // Validate payload
  const result = Joi.validate(payload, projectUpdatedPayloadSchema);
  if (result.error) {
    throw new Error(result.error);
  }

  // Find project by id and update activity. Single update is used as there is no need to wrap it into transaction
  const projectId = payload.projectId;
  const project = await models.Project.findByPk(projectId);
  if (!project) {
    throw new Error(`Project with id ${projectId} not found`);
  }
  const previousValue = project.get({ plain: true });
  project.lastActivityAt = new Date();
  project.lastActivityUserId = payload.initiatorUserId.toString();

  await project.save();

  // first get the existing document and than merge the updated changes and save the new document
  try {
    const doc = await eClient.get({ index: ES_PROJECT_INDEX, type: ES_PROJECT_TYPE, id: previousValue.id });
    // console.log(doc._source, 'Received project from ES');// eslint-disable-line no-underscore-dangle
    const merged = _.merge(doc._source, project.get({ plain: true })); // eslint-disable-line no-underscore-dangle
    console.log(merged, 'Merged project');
    // update the merged document
    await eClient.update({
      index: ES_PROJECT_INDEX,
      type: ES_PROJECT_TYPE,
      id: previousValue.id,
      body: {
        doc: merged,
      },
    });
    console.log(`Succesfully updated project document in ES (projectId: ${previousValue.id})`);
  } catch (error) {
    throw Error(`failed to updated project document in elasitcsearch index (projectId: ${previousValue.id})` +
      `. Details: '${error}'.`);
  }
}

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
  try {
    if (project.type === 'talent-as-a-service') {
      const jobs = _.get(project, 'details.taasDefinition.taasJobs');
      if (!jobs || !jobs.length) {
        app.logger.debug(`no jobs found in the project id: ${project.id}`);
        return;
      }
      app.logger.debug(`${jobs.length} jobs found in the project id: ${project.id}`);
      await Promise.all(
        _.map(
          jobs,
          (job) => {
            // make sure that skills would be unique in the list and only include ones with 'skillId' (actually they all suppose to be with skillId)
            const skills = _.chain(job.skills).map('skillId').uniq().compact()
              .value();
            return createTaasJob({
              projectId: project.id,
              title: job.title,
              description: job.description,
              skills,
              numPositions: Number(job.people),
              resourceType: _.get(job, 'role.value', ''),
              rateType: 'weekly', // hardcode for now
              workload: _.get(job, 'workLoad.title', '').toLowerCase(),
            }).then((createdJob) => {
              app.logger.debug(`jobId: ${createdJob.id} job created with title "${createdJob.title}"`);
            }).catch((err) => {
              app.logger.error(`Unable to create job with title "${job.title}": ${err.message}`);
            });
          },
        ),
      );
    }
  } catch (error) {
    app.logger.error(`Error while creating TaaS jobs: ${error}`);
  }
}

module.exports = {
  projectUpdatedKafkaHandler,
  projectCreatedKafkaHandler,
};
