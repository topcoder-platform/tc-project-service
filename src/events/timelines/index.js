/**
 * Event handlers for timeline create, update and delete
 */
import Joi from 'joi';
import Promise from 'bluebird';
import config from 'config';
import { BUS_API_EVENT, TIMELINE_REFERENCES, REGEX } from '../../constants';
import models from '../../models';
import { createEvent } from '../../services/busApi';

/**
 * Builds the connect project url for the given project id.
 *
 * @param {string|number} projectId the project id
 * @returns {string} the connect project url
 */
function wmProjectUrl(projectId) {
  return `${config.get('workManagerUrl')}projects/${projectId}`;
}
/**
 * Kafka event handlers
 */

const payloadSchema = Joi.object().keys({
  projectId: Joi.number().integer().positive().required(),
  projectName: Joi.string().optional(),
  projectUrl: Joi.string().regex(REGEX.URL).optional(),
  userId: Joi.number().integer().positive().required(),
  initiatorUserId: Joi.number().integer().positive().required(),
}).unknown(true).required();

const findProjectPhaseProduct = function (logger, productId) { // eslint-disable-line func-names
  let product;
  return models.PhaseProduct.findOne({
    where: { id: productId },
    raw: true,
  }).then((_product) => {
    logger.debug('_product', _product);
    if (_product) {
      product = _product;
      const phaseId = product.phaseId;
      const projectId = product.projectId;
      return Promise.all([
        models.ProjectPhase.findOne({
          where: { id: phaseId, projectId },
          raw: true,
        }),
        models.Project.findOne({
          where: { id: projectId },
          raw: true,
        }),
      ]);
    }
    return Promise.reject('Unable to find product');
  }).then((projectAndPhase) => {
    logger.debug('projectAndPhase', projectAndPhase);
    if (projectAndPhase) {
      const phase = projectAndPhase[0];
      const project = projectAndPhase[1];
      return Promise.resolve({ product, phase, project });
    }
    return Promise.reject('Unable to find phase/project');
  });
};

/**
 * Raises the project plan modified event
 * @param   {Object}  app       Application object used to interact with RMQ service
 * @param   {String}  topic     Kafka topic
 * @param   {Object}  payload   Message payload
 * @return  {Promise} Promise
 */
async function timelineAdjustedKafkaHandler(app, topic, payload) {
  app.logger.debug(`Handling Kafka event for ${topic}`);
  // Validate payload
  const result = Joi.validate(payload, payloadSchema);
  if (result.error) {
    throw new Error(result.error);
  }

  const timeline = payload.updatedTimeline;
  // process only if timeline is related to a product reference
  if (timeline && timeline.reference === TIMELINE_REFERENCES.PRODUCT) {
    app.logger.debug('Found product timelin event ');
    const productId = timeline.referenceId;
    app.logger.debug('Calling findProjectPhaseProduct');
    const { project } = await findProjectPhaseProduct(app.logger, productId);
    app.logger.debug('Successfully fetched project, phase and product');
    app.logger.debug('Raising BUS event for PROJECT_PLAN_UPDATED');
    createEvent(BUS_API_EVENT.PROJECT_PLAN_UPDATED, {
      projectId: project.id,
      projectName: project.name,
      projectUrl: wmProjectUrl(project.id),
      userId: payload.userId,
      initiatorUserId: payload.userId,
    }, app.logger);
  }
}

module.exports = {
  timelineAdjustedKafkaHandler,
};
