
import { EVENT, BUS_API_EVENT } from '../constants';
import { projectCreatedHandler, projectUpdatedHandler, projectDeletedHandler,
  projectUpdatedKafkaHandler } from './projects';
import { projectMemberAddedHandler, projectMemberRemovedHandler,
  projectMemberUpdatedHandler } from './projectMembers';
import { projectMemberInviteCreatedHandler,
  projectMemberInviteUpdatedHandler } from './projectMemberInvites';
import { projectAttachmentRemovedHandler,
  projectAttachmentUpdatedHandler, projectAttachmentAddedHandler } from './projectAttachments';
import { projectPhaseAddedHandler, projectPhaseRemovedHandler,
  projectPhaseUpdatedHandler } from './projectPhases';
import { phaseProductAddedHandler, phaseProductRemovedHandler,
  phaseProductUpdatedHandler } from './phaseProducts';
import {
  timelineAddedHandler,
  timelineUpdatedHandler,
  timelineRemovedHandler,
  timelineAdjustedKafkaHandler,
} from './timelines';
import {
  milestoneAddedHandler,
  milestoneUpdatedHandler,
  milestoneRemovedHandler,
  milestoneUpdatedKafkaHandler,
} from './milestones';

export const rabbitHandlers = {
  'project.initial': projectCreatedHandler,
  [EVENT.ROUTING_KEY.PROJECT_DRAFT_CREATED]: projectCreatedHandler,
  [EVENT.ROUTING_KEY.PROJECT_UPDATED]: projectUpdatedHandler,
  [EVENT.ROUTING_KEY.PROJECT_DELETED]: projectDeletedHandler,
  [EVENT.ROUTING_KEY.PROJECT_MEMBER_ADDED]: projectMemberAddedHandler,
  [EVENT.ROUTING_KEY.PROJECT_MEMBER_REMOVED]: projectMemberRemovedHandler,
  [EVENT.ROUTING_KEY.PROJECT_MEMBER_UPDATED]: projectMemberUpdatedHandler,
  [EVENT.ROUTING_KEY.PROJECT_MEMBER_INVITE_CREATED]: projectMemberInviteCreatedHandler,
  [EVENT.ROUTING_KEY.PROJECT_MEMBER_INVITE_UPDATED]: projectMemberInviteUpdatedHandler,
  [EVENT.ROUTING_KEY.PROJECT_ATTACHMENT_ADDED]: projectAttachmentAddedHandler,
  [EVENT.ROUTING_KEY.PROJECT_ATTACHMENT_REMOVED]: projectAttachmentRemovedHandler,
  [EVENT.ROUTING_KEY.PROJECT_ATTACHMENT_UPDATED]: projectAttachmentUpdatedHandler,
  [EVENT.ROUTING_KEY.PROJECT_PHASE_ADDED]: projectPhaseAddedHandler,
  [EVENT.ROUTING_KEY.PROJECT_PHASE_REMOVED]: projectPhaseRemovedHandler,
  [EVENT.ROUTING_KEY.PROJECT_PHASE_UPDATED]: projectPhaseUpdatedHandler,
  [EVENT.ROUTING_KEY.PROJECT_PHASE_ADDED]: projectPhaseAddedHandler,
  [EVENT.ROUTING_KEY.PROJECT_PHASE_REMOVED]: projectPhaseRemovedHandler,
  [EVENT.ROUTING_KEY.PROJECT_PHASE_UPDATED]: projectPhaseUpdatedHandler,
  [EVENT.ROUTING_KEY.PROJECT_PHASE_PRODUCT_ADDED]: phaseProductAddedHandler,
  [EVENT.ROUTING_KEY.PROJECT_PHASE_PRODUCT_REMOVED]: phaseProductRemovedHandler,
  [EVENT.ROUTING_KEY.PROJECT_PHASE_PRODUCT_UPDATED]: phaseProductUpdatedHandler,

  // Timeline and milestone
  'timeline.initial': timelineAddedHandler,
  [EVENT.ROUTING_KEY.TIMELINE_ADDED]: timelineAddedHandler,
  [EVENT.ROUTING_KEY.TIMELINE_REMOVED]: timelineRemovedHandler,
  [EVENT.ROUTING_KEY.TIMELINE_UPDATED]: timelineUpdatedHandler,
  [EVENT.ROUTING_KEY.MILESTONE_ADDED]: milestoneAddedHandler,
  [EVENT.ROUTING_KEY.MILESTONE_REMOVED]: milestoneRemovedHandler,
  [EVENT.ROUTING_KEY.MILESTONE_UPDATED]: milestoneUpdatedHandler,
};

export const kafkaHandlers = {
  // Events defined by project-api
  [BUS_API_EVENT.PROJECT_UPDATED]: projectUpdatedKafkaHandler,
  [BUS_API_EVENT.PROJECT_FILES_UPDATED]: projectUpdatedKafkaHandler,
  [BUS_API_EVENT.PROJECT_TEAM_UPDATED]: projectUpdatedKafkaHandler,
  [BUS_API_EVENT.PROJECT_PLAN_UPDATED]: projectUpdatedKafkaHandler,

  // Events from message-service
  [BUS_API_EVENT.TOPIC_CREATED]: projectUpdatedKafkaHandler,
  [BUS_API_EVENT.TOPIC_UPDATED]: projectUpdatedKafkaHandler,
  [BUS_API_EVENT.POST_CREATED]: projectUpdatedKafkaHandler,
  [BUS_API_EVENT.POST_UPDATED]: projectUpdatedKafkaHandler,

  // Events coming from timeline/milestones (considering it as a separate module/service in future)
  [BUS_API_EVENT.MILESTONE_TRANSITION_COMPLETED]: milestoneUpdatedKafkaHandler,
  [BUS_API_EVENT.TIMELINE_ADJUSTED]: timelineAdjustedKafkaHandler,
};
