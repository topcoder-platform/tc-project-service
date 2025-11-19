/**
 * Event handlers for milestone create, update and delete.
 */
import _ from 'lodash';
import Joi from 'joi';
import Promise from 'bluebird';
import util from '../../util';
// import { createEvent } from '../../services/busApi';
import { EVENT, TIMELINE_REFERENCES, MILESTONE_STATUS, REGEX, RESOURCES, ROUTES } from '../../constants';
import models from '../../models';


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

const findProjectPhaseProduct = function (logger, productId, raw = true) { // eslint-disable-line func-names
  let product;
  return models.PhaseProduct.findOne({
    where: { id: productId },
    raw,
  }).then((_product) => {
    logger.debug('_product', _product);
    if (_product) {
      product = _product;
      const phaseId = product.phaseId;
      const projectId = product.projectId;
      return Promise.all([
        models.ProjectPhase.findOne({
          where: { id: phaseId, projectId },
          raw,
        }),
        models.Project.findOne({
          where: { id: projectId },
          raw,
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
async function milestoneUpdatedKafkaHandler(app, topic, payload) {
  app.logger.info(`Handling Kafka event for ${topic}`);
  // Validate payload
  const result = Joi.validate(payload, payloadSchema);
  if (result.error) {
    throw new Error(result.error);
  }

  const timeline = payload.timeline;
  // process only if timeline is related to a product reference
  if (timeline && timeline.reference === TIMELINE_REFERENCES.PRODUCT) {
    const productId = timeline.referenceId;
    const original = payload.originalMilestone;
    const updated = payload.updatedMilestone;
    app.logger.debug('Calling findProjectPhaseProduct');
    const { project, phase } = await findProjectPhaseProduct(app.logger, productId, false);
    app.logger.debug('Successfully fetched project, phase and product');
    if (original.status !== updated.status) {
      if (updated.status === MILESTONE_STATUS.COMPLETED) {
        app.logger.debug('Found milestone status to be completed');
        app.logger.debug(`Duration: ${timeline.duration}`);
        if (!isNaN(timeline.duration) && !isNaN(timeline.progress)) {
          app.logger.debug(`Current phase progress ${phase.progress} and duration ${phase.duration}`);
          const updatedPhase = await phase.update({
            progress: timeline.progress,
            duration: timeline.duration,
          }, ['progress', 'duration']);
          app.logger.debug(`Updated phase progress ${timeline.progress} and duration ${timeline.duration}`);
          app.logger.debug('Raising node event for PROJECT_PHASE_UPDATED');
          util.sendResourceToKafkaBus(
            {
              params: { projectId: project.id, phaseId: phase.id },
              authUser: { userId: payload.userId },
            },
            EVENT.ROUTING_KEY.PROJECT_PHASE_UPDATED,
            RESOURCES.PHASE,
            _.omit(updatedPhase.toJSON(), 'deletedAt', 'deletedBy'),
            phase,
            _.get(project, 'details.settings.workstreams') ? ROUTES.WORKS.UPDATE : ROUTES.PHASES.UPDATE,
            true, // don't send event to Notification Service as the main event here is updating milestones, not phase
          );
        }
      }
    }
  }
}

module.exports = {
  milestoneUpdatedKafkaHandler,
};
