
import { EVENT, CONNECT_NOTIFICATION_EVENT } from '../constants';
import { projectCreatedHandler,
  projectUpdatedKafkaHandler } from './projects';
import { projectPhaseAddedHandler, projectPhaseRemovedHandler,
  projectPhaseUpdatedHandler } from './projectPhases';
import {
  timelineAddedHandler,
  timelineAdjustedKafkaHandler,
} from './timelines';
import {
  milestoneAddedHandler,
  milestoneUpdatedHandler,
  milestoneUpdatedKafkaHandler,
} from './milestones';

/**
 * Void RabbitMQ event handler.
 * It "ack"s messages which are still published but we don't want to consume.
 *
 * It's used to "disable" events which we don't want to handle anymore. But for a time being
 * we don't want to remove the code of them until we validate that we are good without them.
 *
 * @param {Object} logger  logger
 * @param {Object} msg     RabbitMQ message
 * @param {Object} channel RabbitMQ channel
 * @returns {Promise} nothing
 */
const voidRabbitHandler = (logger, msg, channel) => {
  logger.debug('Calling void RabbitMQ handler.');
  channel.ack(msg);
  return Promise.resolve();
};

// NOTE: We use "project-processor-es" for ES indexing now.
//       So I disable indexing using RabbitMQ for a transition period for most of the objects
//       which don't have any special logic.
//       As soon as we are sure, that "project-processor-es" works well for ES indexing,
//       we should completely remove the handlers for this events.
export const rabbitHandlers = {
  'project.initial': projectCreatedHandler, // is only used `seedElasticsearchIndex.js` and can be removed
  [EVENT.ROUTING_KEY.PROJECT_DRAFT_CREATED]: voidRabbitHandler, // DISABLED
  [EVENT.ROUTING_KEY.PROJECT_UPDATED]: voidRabbitHandler, // DISABLED
  [EVENT.ROUTING_KEY.PROJECT_DELETED]: voidRabbitHandler, // DISABLED
  [EVENT.ROUTING_KEY.PROJECT_MEMBER_ADDED]: voidRabbitHandler, // DISABLED
  [EVENT.ROUTING_KEY.PROJECT_MEMBER_REMOVED]: voidRabbitHandler, // DISABLED
  [EVENT.ROUTING_KEY.PROJECT_MEMBER_UPDATED]: voidRabbitHandler, // DISABLED
  [EVENT.ROUTING_KEY.PROJECT_MEMBER_INVITE_CREATED]: voidRabbitHandler, // DISABLED
  [EVENT.ROUTING_KEY.PROJECT_MEMBER_INVITE_UPDATED]: voidRabbitHandler, // DISABLED
  [EVENT.ROUTING_KEY.PROJECT_ATTACHMENT_ADDED]: voidRabbitHandler, // DISABLED
  [EVENT.ROUTING_KEY.PROJECT_ATTACHMENT_REMOVED]: voidRabbitHandler, // DISABLED
  [EVENT.ROUTING_KEY.PROJECT_ATTACHMENT_UPDATED]: voidRabbitHandler, // DISABLED

  // project phase handles additionally implement logic for creating associated topics in Message Service
  [EVENT.ROUTING_KEY.PROJECT_PHASE_ADDED]: projectPhaseAddedHandler, // index in ES because of cascade updates
  [EVENT.ROUTING_KEY.PROJECT_PHASE_REMOVED]: projectPhaseRemovedHandler, // doesn't index in ES
  [EVENT.ROUTING_KEY.PROJECT_PHASE_UPDATED]: projectPhaseUpdatedHandler, // index in ES because of cascade updates

  [EVENT.ROUTING_KEY.PROJECT_PHASE_PRODUCT_ADDED]: voidRabbitHandler, // DISABLED
  [EVENT.ROUTING_KEY.PROJECT_PHASE_PRODUCT_REMOVED]: voidRabbitHandler, // DISABLED
  [EVENT.ROUTING_KEY.PROJECT_PHASE_PRODUCT_UPDATED]: voidRabbitHandler, // DISABLED

  // Timeline and milestone
  'timeline.initial': timelineAddedHandler, // is only used `seedElasticsearchIndex.js` and can be removed
  [EVENT.ROUTING_KEY.TIMELINE_ADDED]: voidRabbitHandler, // DISABLED
  [EVENT.ROUTING_KEY.TIMELINE_REMOVED]: voidRabbitHandler, // DISABLED
  [EVENT.ROUTING_KEY.TIMELINE_UPDATED]: voidRabbitHandler, // DISABLED
  [EVENT.ROUTING_KEY.MILESTONE_ADDED]: milestoneAddedHandler, // index in ES because of cascade updates
  [EVENT.ROUTING_KEY.MILESTONE_REMOVED]: voidRabbitHandler, // DISABLED
  [EVENT.ROUTING_KEY.MILESTONE_UPDATED]: milestoneUpdatedHandler, // index in ES because of cascade updates
};

export const kafkaHandlers = {
  // Events defined by project-api
  [CONNECT_NOTIFICATION_EVENT.PROJECT_UPDATED]: projectUpdatedKafkaHandler,
  [CONNECT_NOTIFICATION_EVENT.PROJECT_FILES_UPDATED]: projectUpdatedKafkaHandler,
  [CONNECT_NOTIFICATION_EVENT.PROJECT_TEAM_UPDATED]: projectUpdatedKafkaHandler,
  [CONNECT_NOTIFICATION_EVENT.PROJECT_PLAN_UPDATED]: projectUpdatedKafkaHandler,

  // Events from message-service
  [CONNECT_NOTIFICATION_EVENT.TOPIC_CREATED]: projectUpdatedKafkaHandler,
  [CONNECT_NOTIFICATION_EVENT.TOPIC_UPDATED]: projectUpdatedKafkaHandler,
  [CONNECT_NOTIFICATION_EVENT.POST_CREATED]: projectUpdatedKafkaHandler,
  [CONNECT_NOTIFICATION_EVENT.POST_UPDATED]: projectUpdatedKafkaHandler,

  // Events coming from timeline/milestones (considering it as a separate module/service in future)
  [CONNECT_NOTIFICATION_EVENT.MILESTONE_TRANSITION_COMPLETED]: milestoneUpdatedKafkaHandler,
  [CONNECT_NOTIFICATION_EVENT.TIMELINE_ADJUSTED]: timelineAdjustedKafkaHandler,
};
