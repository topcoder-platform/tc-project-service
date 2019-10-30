
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

// NOTE: We use "project-processor-es" for ES indexing now.
//       So I disable indexing using RabbitMQ for a transition period for most of the objects
//       which don't have any special logic.
//       As soon as we are sure, that "project-processor-es" works well for ES indexing,
//       we should completely remove the handlers for this events.
export const rabbitHandlers = {
  'project.initial': projectCreatedHandler, // is only used `seedElasticsearchIndex.js` and can be removed
  // [EVENT.ROUTING_KEY.PROJECT_DRAFT_CREATED]: projectCreatedHandler,
  // [EVENT.ROUTING_KEY.PROJECT_UPDATED]: projectUpdatedHandler,
  // [EVENT.ROUTING_KEY.PROJECT_DELETED]: projectDeletedHandler,
  // [EVENT.ROUTING_KEY.PROJECT_MEMBER_ADDED]: projectMemberAddedHandler,
  // [EVENT.ROUTING_KEY.PROJECT_MEMBER_REMOVED]: projectMemberRemovedHandler,
  // [EVENT.ROUTING_KEY.PROJECT_MEMBER_UPDATED]: projectMemberUpdatedHandler,
  // [EVENT.ROUTING_KEY.PROJECT_MEMBER_INVITE_CREATED]: projectMemberInviteCreatedHandler,
  // [EVENT.ROUTING_KEY.PROJECT_MEMBER_INVITE_UPDATED]: projectMemberInviteUpdatedHandler,
  // [EVENT.ROUTING_KEY.PROJECT_ATTACHMENT_ADDED]: projectAttachmentAddedHandler,
  // [EVENT.ROUTING_KEY.PROJECT_ATTACHMENT_REMOVED]: projectAttachmentRemovedHandler,
  // [EVENT.ROUTING_KEY.PROJECT_ATTACHMENT_UPDATED]: projectAttachmentUpdatedHandler,

  // project phase handles additionally implement logic for creating associated topics in Message Service
  [EVENT.ROUTING_KEY.PROJECT_PHASE_ADDED]: projectPhaseAddedHandler, // index in ES because of cascade updates
  [EVENT.ROUTING_KEY.PROJECT_PHASE_REMOVED]: projectPhaseRemovedHandler, // doesn't index in ES
  [EVENT.ROUTING_KEY.PROJECT_PHASE_UPDATED]: projectPhaseUpdatedHandler, // index in ES because of cascade updates

  // Timeline and milestone
  'timeline.initial': timelineAddedHandler, // is only used `seedElasticsearchIndex.js` and can be removed
  [EVENT.ROUTING_KEY.MILESTONE_ADDED]: milestoneAddedHandler, // index in ES because of cascade updates
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
