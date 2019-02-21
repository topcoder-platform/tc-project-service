
export const PROJECT_STATUS = {
  DRAFT: 'draft',
  IN_REVIEW: 'in_review',
  REVIEWED: 'reviewed',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  PAUSED: 'paused',
  CANCELLED: 'cancelled',
};

export const PROJECT_PHASE_STATUS = PROJECT_STATUS;

export const MILESTONE_STATUS = PROJECT_STATUS;

export const PROJECT_MEMBER_ROLE = {
  MANAGER: 'manager',
  OBSERVER: 'observer',
  CUSTOMER: 'customer',
  COPILOT: 'copilot',
  ACCOUNT_MANAGER: 'account_manager',
};

export const PROJECT_MEMBER_MANAGER_ROLES = [PROJECT_MEMBER_ROLE.MANAGER, PROJECT_MEMBER_ROLE.OBSERVER];

export const USER_ROLE = {
  TOPCODER_ADMIN: 'administrator',
  MANAGER: 'Connect Manager',
  TOPCODER_ACCOUNT_MANAGER: 'Connect Account Manager',
  COPILOT: 'Connect Copilot',
  CONNECT_ADMIN: 'Connect Admin',
};

export const ADMIN_ROLES = [USER_ROLE.CONNECT_ADMIN, USER_ROLE.TOPCODER_ADMIN];

export const MANAGER_ROLES = [...ADMIN_ROLES, USER_ROLE.MANAGER, PROJECT_MEMBER_ROLE.ACCOUNT_MANAGER];

export const EVENT = {
  ROUTING_KEY: {
    PROJECT_MEMBER_ADDED: 'project.member.added',
    PROJECT_MEMBER_REMOVED: 'project.member.removed',
    PROJECT_MEMBER_UPDATED: 'project.member.updated',

    PROJECT_ATTACHMENT_ADDED: 'project.attachment.added',
    PROJECT_ATTACHMENT_REMOVED: 'project.attachment.removed',
    PROJECT_ATTACHMENT_UPDATED: 'project.attachment.updated',

    PROJECT_DRAFT_CREATED: 'project.draft-created',
    PROJECT_UPDATED: 'project.updated',
    PROJECT_DELETED: 'project.deleted',

    PROJECT_PHASE_ADDED: 'project.phase.added',
    PROJECT_PHASE_UPDATED: 'project.phase.updated',
    PROJECT_PHASE_REMOVED: 'project.phase.removed',

    PROJECT_PHASE_PRODUCT_ADDED: 'project.phase.product.added',
    PROJECT_PHASE_PRODUCT_UPDATED: 'project.phase.product.updated',
    PROJECT_PHASE_PRODUCT_REMOVED: 'project.phase.product.removed',

    TIMELINE_ADDED: 'timeline.added',
    TIMELINE_UPDATED: 'timeline.updated',
    TIMELINE_REMOVED: 'timeline.removed',

    MILESTONE_ADDED: 'milestone.added',
    MILESTONE_UPDATED: 'milestone.updated',
    MILESTONE_REMOVED: 'milestone.removed',

    PROJECT_MEMBER_INVITE_CREATED: 'project.member.invite.created',
    PROJECT_MEMBER_INVITE_UPDATED: 'project.member.invite.updated',
  },
};

export const BUS_API_EVENT = {
  PROJECT_CREATED: 'notifications.connect.project.created',
  PROJECT_UPDATED: 'connect.action.project.updated',
  PROJECT_SUBMITTED_FOR_REVIEW: 'notifications.connect.project.submittedForReview',
  PROJECT_APPROVED: 'notifications.connect.project.approved',
  PROJECT_PAUSED: 'notifications.connect.project.paused',
  PROJECT_COMPLETED: 'notifications.connect.project.completed',
  PROJECT_CANCELED: 'notifications.connect.project.canceled',
  PROJECT_ACTIVE: 'notifications.connect.project.active',

  PROJECT_PHASE_TRANSITION_ACTIVE: 'notifications.connect.project.phase.transition.active',
  PROJECT_PHASE_TRANSITION_COMPLETED: 'notifications.connect.project.phase.transition.completed',
  PROJECT_PHASE_UPDATE_PAYMENT: 'notifications.connect.project.phase.update.payment',
  PROJECT_PHASE_UPDATE_PROGRESS: 'notifications.connect.project.phase.update.progress',
  PROJECT_PHASE_UPDATE_SCOPE: 'notifications.connect.project.phase.update.scope',

  MEMBER_JOINED: 'notifications.connect.project.member.joined',
  MEMBER_LEFT: 'notifications.connect.project.member.left',
  MEMBER_REMOVED: 'notifications.connect.project.member.removed',
  MEMBER_ASSIGNED_AS_OWNER: 'notifications.connect.project.member.assignedAsOwner',
  MEMBER_JOINED_COPILOT: 'notifications.connect.project.member.copilotJoined',
  MEMBER_JOINED_MANAGER: 'notifications.connect.project.member.managerJoined',

  PROJECT_LINK_CREATED: 'notifications.connect.project.linkCreated',
  PROJECT_FILE_UPLOADED: 'notifications.connect.project.fileUploaded',
  PROJECT_SPECIFICATION_MODIFIED: 'connect.action.project.updated.spec',
  PROJECT_PROGRESS_MODIFIED: 'connect.action.project.updated.progress',
  PROJECT_FILES_UPDATED: 'connect.action.project.files.updated',
  PROJECT_TEAM_UPDATED: 'connect.action.project.team.updated',

  // When phase is added/updated/deleted from the project,
  // When product is added/deleted from a phase
  // When product is updated on any field other than specification
  PROJECT_PLAN_UPDATED: 'connect.action.project.plan.updated',

  PROJECT_PLAN_READY: 'connect.action.project.plan.ready',

  // When milestone is added/deleted to/from the phase,
  // When milestone is updated for duration/startDate/endDate/status
  TIMELINE_ADJUSTED: 'connect.action.timeline.adjusted',

  // When specification of a product is modified
  PROJECT_PRODUCT_SPECIFICATION_MODIFIED: 'connect.action.project.product.update.spec',

  MILESTONE_ADDED: 'connect.action.timeline.milestone.added',
  MILESTONE_REMOVED: 'connect.action.timeline.milestone.removed',
  MILESTONE_UPDATED: 'connect.action.timeline.milestone.updated',
  // When milestone is marked as active
  MILESTONE_TRANSITION_ACTIVE: 'connect.action.timeline.milestone.transition.active',
  // When milestone is marked as completed
  MILESTONE_TRANSITION_COMPLETED: 'connect.action.timeline.milestone.transition.completed',
  // When milestone is waiting for customers's input
  MILESTONE_WAITING_CUSTOMER: 'connect.action.timeline.milestone.waiting.customer',

  // TC Message Service events
  TOPIC_CREATED: 'notifications.connect.project.topic.created',
  TOPIC_UPDATED: 'notifications.connect.project.topic.updated',
  POST_CREATED: 'notifications.connect.project.post.created',
  POST_UPDATED: 'notifications.connect.project.post.edited',

  // Project Member Invites
  PROJECT_MEMBER_INVITE_CREATED: 'notifications.connect.project.member.invite.created',
  PROJECT_MEMBER_INVITE_UPDATED: 'notifications.connect.project.member.invite.updated',
  PROJECT_MEMBER_EMAIL_INVITE_CREATED: 'connect.action.email.project.member.invite.created',
};

export const REGEX = {
  URL: /^(http(s?):\/\/)?(www\.)?[a-zA-Z0-9\.\-\_]+(\.[a-zA-Z]{2,15})+(\:[0-9]{2,5})?(\/[a-zA-Z0-9\_\-\s\.\/\?\%\#\&\=;]*)?$/, // eslint-disable-line
};

export const TOKEN_SCOPES = {
  CONNECT_PROJECT_ADMIN: 'all:connect_project',
};

export const TIMELINE_REFERENCES = {
  PROJECT: 'project',
  PHASE: 'phase',
  PRODUCT: 'product',
};

export const MILESTONE_TEMPLATE_REFERENCES = {
  PRODUCT_TEMPLATE: 'productTemplate',
};

export const INVITE_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REFUSED: 'refused',
  CANCELED: 'canceled',
};
