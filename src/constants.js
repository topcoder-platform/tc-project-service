
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

export const PROJECT_MEMBER_ROLE = {
  MANAGER: 'manager',
  CUSTOMER: 'customer',
  COPILOT: 'copilot',
};

export const USER_ROLE = {
  TOPCODER_ADMIN: 'administrator',
  MANAGER: 'Connect Manager',
  COPILOT: 'Connect Copilot',
  CONNECT_ADMIN: 'Connect Admin',
};

export const ADMIN_ROLES = [USER_ROLE.CONNECT_ADMIN, USER_ROLE.TOPCODER_ADMIN];

export const MANAGER_ROLES = [...ADMIN_ROLES, USER_ROLE.MANAGER];

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
  },
};

export const BUS_API_EVENT = {
  PROJECT_CREATED: 'notifications.connect.project.created',
  PROJECT_SUBMITTED_FOR_REVIEW: 'notifications.connect.project.submittedForReview',
  PROJECT_APPROVED: 'notifications.connect.project.approved',
  PROJECT_PAUSED: 'notifications.connect.project.paused',
  PROJECT_COMPLETED: 'notifications.connect.project.completed',
  PROJECT_CANCELED: 'notifications.connect.project.canceled',
  PROJECT_ACTIVE: 'notifications.connect.project.active',

  MEMBER_JOINED: 'notifications.connect.project.member.joined',
  MEMBER_LEFT: 'notifications.connect.project.member.left',
  MEMBER_REMOVED: 'notifications.connect.project.member.removed',
  MEMBER_ASSIGNED_AS_OWNER: 'notifications.connect.project.member.assignedAsOwner',
  MEMBER_JOINED_COPILOT: 'notifications.connect.project.member.copilotJoined',
  MEMBER_JOINED_MANAGER: 'notifications.connect.project.member.managerJoined',

  PROJECT_LINK_CREATED: 'notifications.connect.project.linkCreated',
  PROJECT_FILE_UPLOADED: 'notifications.connect.project.fileUploaded',
  PROJECT_SPECIFICATION_MODIFIED: 'notifications.connect.project.specificationModified',

  // When phase is added/updated/deleted from the project,
  // When product is added/deleted from a phase
  // When product is updated on any field other than specification
  PROJECT_PLAN_MODIFIED: 'notifications.connect.project.planModified',

  // When specification of a product is modified
  PROJECT_PRODUCT_SPECIFICATION_MODIFIED: 'notifications.connect.project.productSpecificationModified',
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
};
