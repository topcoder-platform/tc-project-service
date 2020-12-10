/**
 * Event handlers for milestone create, update and delete.
 */
import config from 'config';
import _ from 'lodash';
import Joi from 'joi';
import Promise from 'bluebird';
import util from '../../util';
// import { createEvent } from '../../services/busApi';
import { EVENT, TIMELINE_REFERENCES, MILESTONE_STATUS, REGEX, RESOURCES, ROUTES } from '../../constants';
import models from '../../models';

const ES_TIMELINE_INDEX = config.get('elasticsearchConfig.timelineIndexName');
const ES_TIMELINE_TYPE = config.get('elasticsearchConfig.timelineDocType');

const eClient = util.getElasticSearchClient();

/**
 * Handler for milestone creation event
 * @param  {Object} logger  logger to log along with trace id
 * @param  {Object} msg     event payload
 * @param  {Object} channel channel to ack, nack
 */
const milestoneAddedHandler = Promise.coroutine(function* (logger, msg, channel) { // eslint-disable-line func-names
  const data = JSON.parse(msg.content.toString());
  try {
    const doc = yield eClient.get({ index: ES_TIMELINE_INDEX, type: ES_TIMELINE_TYPE, id: data.timelineId });
    const milestones = _.isArray(doc._source.milestones) ? doc._source.milestones : []; // eslint-disable-line no-underscore-dangle

    // Increase the order of the other milestones in the same timeline,
    // which have `order` >= this milestone order
    _.each(milestones, (milestone) => {
      if (milestone.order >= data.order) {
        milestone.order += 1; // eslint-disable-line no-param-reassign
      }
    });

    milestones.push(data);
    const merged = _.assign(doc._source, { milestones }); // eslint-disable-line no-underscore-dangle
    yield eClient.update({
      index: ES_TIMELINE_INDEX,
      type: ES_TIMELINE_TYPE,
      id: data.timelineId,
      body: { doc: merged },
    });
    logger.debug('milestone added to timeline document successfully');
    channel.ack(msg);
  } catch (error) {
    logger.error(`Error processing event (milestoneId: ${data.id})`, error);
    // if the message has been redelivered dont attempt to reprocess it
    channel.nack(msg, false, !msg.fields.redelivered);
  }
});

/**
 * Handler for milestone updated event
 * @param  {Object} logger  logger to log along with trace id
 * @param  {Object} msg     event payload
 * @param  {Object} channel channel to ack, nack
 * @returns {undefined}
 */
const milestoneUpdatedHandler = Promise.coroutine(function* (logger, msg, channel) { // eslint-disable-line func-names
  const data = JSON.parse(msg.content.toString());
  try {
    const doc = yield eClient.get({ index: ES_TIMELINE_INDEX, type: ES_TIMELINE_TYPE, id: data.original.timelineId });
    const milestones = _.map(doc._source.milestones, (single) => { // eslint-disable-line no-underscore-dangle
      if (single.id === data.original.id) {
        return _.assign(single, data.updated);
      }
      return single;
    });

    if (data.cascadedUpdates && data.cascadedUpdates.milestones && data.cascadedUpdates.milestones.length > 0) {
      const otherUpdatedMilestones = data.cascadedUpdates.milestones;
      _.each(milestones, (m) => {
        // finds the updated milestone from the cascaded updates
        const updatedMilestoneData = _.find(otherUpdatedMilestones, oum => oum.updated && oum.updated.id === m.id);
        logger.debug('updatedMilestone=>', updatedMilestoneData);
        if (updatedMilestoneData && updatedMilestoneData.updated) {
          _.assign(m, updatedMilestoneData.updated);
        }
      });
    }

    let updatedTimeline = doc._source; // eslint-disable-line no-underscore-dangle
    // if timeline has been modified during milestones updates
    if (data.cascadedUpdates && data.cascadedUpdates.timeline && data.cascadedUpdates.timeline.updated) {
      // merge updated timeline with the object in ES index, the same way as we do when updating timeline in ES using timeline endpoints
      updatedTimeline = _.merge(doc._source, data.cascadedUpdates.timeline.updated); // eslint-disable-line no-underscore-dangle
    }

    const merged = _.assign(updatedTimeline, { milestones });
    yield eClient.update({
      index: ES_TIMELINE_INDEX,
      type: ES_TIMELINE_TYPE,
      id: data.original.timelineId,
      body: {
        doc: merged,
      },
    });
    logger.debug('elasticsearch index updated, milestone updated successfully');
    channel.ack(msg);
  } catch (error) {
    logger.error(`Error processing event (milestoneId: ${data.original.id})`, error);
    // if the message has been redelivered dont attempt to reprocess it
    channel.nack(msg, false, !msg.fields.redelivered);
  }
});

/**
 * Handler for milestone deleted event
 * @param  {Object} logger  logger to log along with trace id
 * @param  {Object} msg     event payload
 * @param  {Object} channel channel to ack, nack
 * @returns {undefined}
 */
const milestoneRemovedHandler = Promise.coroutine(function* (logger, msg, channel) { // eslint-disable-line func-names
  const data = JSON.parse(msg.content.toString());
  try {
    const doc = yield eClient.get({ index: ES_TIMELINE_INDEX, type: ES_TIMELINE_TYPE, id: data.timelineId });
    const milestones = _.filter(doc._source.milestones, single => single.id !== data.id); // eslint-disable-line no-underscore-dangle
    const merged = _.assign(doc._source, { milestones }); // eslint-disable-line no-underscore-dangle
    yield eClient.update({
      index: ES_TIMELINE_INDEX,
      type: ES_TIMELINE_TYPE,
      id: data.timelineId,
      body: {
        doc: merged,
      },
    });
    logger.debug('milestone removed from timeline document successfully');
    channel.ack(msg);
  } catch (error) {
    logger.error(`Error processing event (milestoneId: ${data.id})`, error);
    // if the message has been redelivered dont attempt to reprocess it
    channel.nack(msg, false, !msg.fields.redelivered);
  }
});

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
  milestoneAddedHandler,
  milestoneRemovedHandler,
  milestoneUpdatedHandler,
  milestoneUpdatedKafkaHandler,
};
