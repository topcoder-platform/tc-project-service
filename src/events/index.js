
import { EVENT } from '../constants';
import { projectCreatedHandler, projectUpdatedHandler, projectDeletedHandler } from './projects';
import { projectMemberAddedHandler, projectMemberRemovedHandler,
  projectMemberUpdatedHandler } from './projectMembers';
import { projectAttachmentAddedHandler, projectAttachmentRemovedHandler,
  projectAttachmentUpdatedHandler } from './projectAttachments';
import { projectPhaseAddedHandler, projectPhaseRemovedHandler,
  projectPhaseUpdatedHandler } from './projectPhases';
import { phaseProductAddedHandler, phaseProductRemovedHandler,
  phaseProductUpdatedHandler } from './phaseProducts';
import { timelineAddedHandler, timelineUpdatedHandler, timelineRemovedHandler } from './timelines';
import { milestoneAddedHandler, milestoneUpdatedHandler, milestoneRemovedHandler } from './milestones';

export default {
  'project.initial': projectCreatedHandler,
  [EVENT.ROUTING_KEY.PROJECT_DRAFT_CREATED]: projectCreatedHandler,
  [EVENT.ROUTING_KEY.PROJECT_UPDATED]: projectUpdatedHandler,
  [EVENT.ROUTING_KEY.PROJECT_DELETED]: projectDeletedHandler,
  [EVENT.ROUTING_KEY.PROJECT_MEMBER_ADDED]: projectMemberAddedHandler,
  [EVENT.ROUTING_KEY.PROJECT_MEMBER_REMOVED]: projectMemberRemovedHandler,
  [EVENT.ROUTING_KEY.PROJECT_MEMBER_UPDATED]: projectMemberUpdatedHandler,
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
