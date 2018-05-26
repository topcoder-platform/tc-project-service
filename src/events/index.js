
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
};
