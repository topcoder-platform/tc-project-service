import _ from 'lodash';
import Joi from 'joi';
import config from 'config';
import util from '../../util';
import models from '../../models';
import { REGEX } from '../../constants';

const ES_PROJECT_INDEX = config.get('elasticsearchConfig.indexName');
const ES_PROJECT_TYPE = config.get('elasticsearchConfig.docType');
const eClient = util.getElasticSearchClient();

const payloadSchema = Joi.object().keys({
  projectId: Joi.number().integer().positive().required(),
  projectName: Joi.string().required(),
  projectUrl: Joi.string().regex(REGEX.URL).required(),
  userId: Joi.number().integer().positive().required(),
  initiatorUserId: Joi.number().integer().positive().required(),
}).required();

/**
 * Updates project activity fields. throws exceptions in case of error
 * @param   {Object}  app       Application object used to interact with RMQ service
 * @param   {String}  topic     Kafka topic
 * @param   {Object}  payload   Message payload
 * @return  {Promise} Promise
 */
export default async function updateProjectActivity(app, topic, payload) {
  // Validate payload
  const result = Joi.validate(payload, payloadSchema);
  if (result.error) {
    throw new Error(result.error);
  }

  // Find project by id and update activity. Single update is used as there is no need to wrap it into transaction
  const projectId = payload.projectId;
  const project = await models.Project.findById(projectId);
  if (!project) {
    throw new Error(`Project with id ${projectId} not found`);
  }
  const previousValue = project.get({ plain: true });
  project.lastActivityAt = new Date();
  project.lastActivityUserId = payload.initiatorUserId;

  await project.save();

  // first get the existing document and than merge the updated changes and save the new document
  const doc = await eClient.get({ index: ES_PROJECT_INDEX, type: ES_PROJECT_TYPE, id: previousValue.id });
  const merged = _.merge(doc._source, project.get({ plain: true }));        // eslint-disable-line no-underscore-dangle
  // update the merged document
  await eClient.update({
    index: ES_PROJECT_INDEX,
    type: ES_PROJECT_TYPE,
    id: previousValue.id,
    body: {
      doc: merged,
    },
  });
}
