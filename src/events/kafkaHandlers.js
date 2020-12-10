/**
 * BUS Event Handlers
 */
import {
  CONNECT_NOTIFICATION_EVENT,
  BUS_API_EVENT,
  RESOURCES,
} from '../constants';
import {
  projectCreatedKafkaHandler,
  projectUpdatedKafkaHandler,
} from './projects';
import {
  projectPhaseAddedKafkaHandler,
  projectPhaseRemovedKafkaHandler,
  projectPhaseUpdatedKafkaHandler,
} from './projectPhases';
import { timelineAdjustedKafkaHandler } from './timelines';
import { milestoneUpdatedKafkaHandler } from './milestones';

const kafkaHandlers = {
  /**
   * Deprecated specific Bus Events
   */
  // Events defined by project-api
  [CONNECT_NOTIFICATION_EVENT.PROJECT_UPDATED]: projectUpdatedKafkaHandler,
  [CONNECT_NOTIFICATION_EVENT.PROJECT_ATTACHMENT_UPDATED]: projectUpdatedKafkaHandler,
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

/**
 * Register New Unified Bus Event Handlers
 *
 * We need this special method so it would properly merge topics with the same names
 * but different resources.
 *
 * @param {String} topic Kafka topic name
 * @param {String} resource resource name
 * @param {Function} handler handler method
 *
 * @returns {void}
 */
const registerKafkaHandler = (topic, resource, handler) => {
  let topicConfig = kafkaHandlers[topic];

  // if config for topic is not yet initialized, create it
  if (!topicConfig) {
    topicConfig = {};
    kafkaHandlers[topic] = topicConfig;
  }

  if (typeof topicConfig !== 'object') {
    throw new Error(
      `Topic "${topic}" should be defined as object with resource names as keys.`,
    );
  }

  if (topicConfig[resource]) {
    throw new Error(
      `Handler for topic "${topic}" with resource ${resource} has been already registered.`,
    );
  }

  topicConfig[resource] = handler;
};

registerKafkaHandler(
  BUS_API_EVENT.PROJECT_CREATED,
  RESOURCES.PROJECT,
  projectCreatedKafkaHandler,
);
registerKafkaHandler(
  BUS_API_EVENT.PROJECT_PHASE_CREATED,
  RESOURCES.PHASE,
  projectPhaseAddedKafkaHandler,
);
registerKafkaHandler(
  BUS_API_EVENT.PROJECT_PHASE_UPDATED,
  RESOURCES.PHASE,
  projectPhaseUpdatedKafkaHandler,
);
registerKafkaHandler(
  BUS_API_EVENT.PROJECT_PHASE_DELETED,
  RESOURCES.PHASE,
  projectPhaseRemovedKafkaHandler,
);


export default kafkaHandlers;
