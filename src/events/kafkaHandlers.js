/**
 * BUS Event Handlers
 */
import { CONNECT_NOTIFICATION_EVENT, BUS_API_EVENT, RESOURCES } from '../constants';
import {
  projectCreatedKafkaHandler,
  projectUpdatedKafkaHandler } from './projects';
import { projectPhaseAddedKafkaHandler, projectPhaseRemovedKafkaHandler,
  projectPhaseUpdatedKafkaHandler } from './projectPhases';
import {
  timelineAdjustedKafkaHandler,
} from './timelines';
import {
  milestoneUpdatedKafkaHandler,
} from './milestones';

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

  /**
   * New Unified Bus Events
   */
  [BUS_API_EVENT.PROJECT_CREATED]: {
    [RESOURCES.PROJECT]: projectCreatedKafkaHandler,
  },
  [BUS_API_EVENT.PROJECT_PHASE_CREATED]: {
    [RESOURCES.PHASE]: projectPhaseAddedKafkaHandler,
  },
  [BUS_API_EVENT.PROJECT_PHASE_UPDATED]: {
    [RESOURCES.PHASE]: projectPhaseUpdatedKafkaHandler,
  },
  [BUS_API_EVENT.PROJECT_PHASE_DELETED]: {
    [RESOURCES.PHASE]: projectPhaseRemovedKafkaHandler,
  },
};

export default kafkaHandlers;
