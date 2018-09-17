import Joi from 'joi';
import uuid from 'uuid';
import models from '../../models';
import { REGEX, EVENT } from '../../constants';

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
  const jsonMessage = JSON.parse(payload);
  const result = Joi.validate(jsonMessage, payloadSchema);
  if (result.error) {
    throw new Error(result.error);
  }

  // Find project by id and update activity. Single update is used as there is no need to wrap it into transaction
  const projectId = jsonMessage.projectId;
  const project = await models.Project.findById(projectId);
  if (!project) {
    throw new Error(`Project with id ${projectId} not found`);
  }
  const previousValue = project.get({ plain: true });
  project.lastActivityAt = new Date();
  project.lastActivityUserId = jsonMessage.initiatorUserId;

  await project.save();

  app.services.pubsub.publish(
    EVENT.ROUTING_KEY.PROJECT_UPDATED, {
      original: previousValue,
      updated: project.get({ plain: true }),
    }, {
      correlationId: uuid.v4(),
    },
  );
}
