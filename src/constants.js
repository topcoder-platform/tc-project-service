
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

export const PROJECT_MEMBER_MANAGER_ROLES = [
  PROJECT_MEMBER_ROLE.MANAGER,
  PROJECT_MEMBER_ROLE.OBSERVER,
  PROJECT_MEMBER_ROLE.ACCOUNT_MANAGER,
];

export const USER_ROLE = {
  TOPCODER_ADMIN: 'administrator',
  MANAGER: 'Connect Manager',
  TOPCODER_ACCOUNT_MANAGER: 'Connect Account Manager',
  COPILOT: 'Connect Copilot',
  CONNECT_ADMIN: 'Connect Admin',
  COPILOT_MANAGER: 'Connect Copilot Manager',
};

export const ADMIN_ROLES = [USER_ROLE.CONNECT_ADMIN, USER_ROLE.TOPCODER_ADMIN];

export const MANAGER_ROLES = [
  ...ADMIN_ROLES,
  USER_ROLE.MANAGER,
  USER_ROLE.TOPCODER_ACCOUNT_MANAGER,
  USER_ROLE.COPILOT_MANAGER,
];

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

    MILESTONE_TEMPLATE_ADDED: 'milestone.template.added',
    MILESTONE_TEMPLATE_UPDATED: 'milestone.template.updated',
    MILESTONE_TEMPLATE_REMOVED: 'milestone.template.removed',

    PROJECT_MEMBER_INVITE_CREATED: 'project.member.invite.created',
    PROJECT_MEMBER_INVITE_UPDATED: 'project.member.invite.updated',
    PROJECT_MEMBER_INVITE_REMOVED: 'project.member.invite.deleted',

    // project metadata
    PROJECT_METADATA_CREATE: 'project.metadata.create',
    PROJECT_METADATA_UPDATE: 'project.metadata.update',
    PROJECT_METADATA_DELETE: 'project.metadata.delete',

    // project template
    PROJECT_TEMPLATE_CREATED: 'project.template.created',
    PROJECT_TEMPLATE_UPDATED: 'project.template.updated',
    PROJECT_TEMPLATE_DELETED: 'project.template.deleted',
  },
};

export const BUS_API_EVENT = {
  PROJECT_CREATED: 'project.notification.create',
  PROJECT_UPDATED: 'project.notification.update',
  PROJECT_DELETED: 'project.notification.delete',

  PROJECT_MEMBER_ADDED: 'project.notification.create',
  PROJECT_MEMBER_REMOVED: 'project.notification.delete',
  PROJECT_MEMBER_UPDATED: 'project.notification.update',

  PROJECT_ATTACHMENT_ADDED: 'project.notification.create',
  PROJECT_ATTACHMENT_REMOVED: 'project.notification.delete',
  PROJECT_ATTACHMENT_UPDATED: 'project.notification.update',

  // When phase is added/updated/deleted from the project,
  // When product is added/deleted from a phase
  // When product is updated on any field other than specification
  PROJECT_PHASE_CREATED: 'project.notification.create',
  PROJECT_PHASE_UPDATED: 'project.notification.update',
  PROJECT_PHASE_DELETED: 'project.notification.delete',

  // phase product
  PROJECT_PHASE_PRODUCT_ADDED: 'project.notification.create',
  PROJECT_PHASE_PRODUCT_UPDATED: 'project.notification.update',
  PROJECT_PHASE_PRODUCT_REMOVED: 'project.notification.delete',

  // timeline
  TIMELINE_CREATED: 'project.notification.create',
  TIMELINE_UPDATED: 'project.notification.update',
  TIMELINE_DELETED: 'project.notification.delete',

  MILESTONE_ADDED: 'project.notification.create',
  MILESTONE_REMOVED: 'project.notification.delete',
  MILESTONE_UPDATED: 'project.notification.update',

  MILESTONE_TEMPLATE_ADDED: 'project.notification.create',
  MILESTONE_TEMPLATE_REMOVED: 'project.notification.delete',
  MILESTONE_TEMPLATE_UPDATED: 'project.notification.update',

  // TC Message Service events
  TOPIC_CREATED: 'notifications.connect.project.topic.created',
  TOPIC_UPDATED: 'notifications.connect.project.topic.updated',
  POST_CREATED: 'notifications.connect.project.post.created',
  POST_UPDATED: 'notifications.connect.project.post.edited',

  // Project Member Invites
  PROJECT_MEMBER_INVITE_CREATED: 'project.notification.create',
  PROJECT_MEMBER_INVITE_UPDATED: 'project.notification.update',
  PROJECT_MEMBER_INVITE_REMOVED: 'project.notification.delete',

  // metadata
  PROJECT_METADATA_CREATE: 'project.notification.create',
  PROJECT_METADATA_UPDATE: 'project.notification.update',
  PROJECT_METADATA_DELETE: 'project.notification.delete',
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
  REQUESTED: 'requested',
  REQUEST_REJECTED: 'request_rejected',
  REQUEST_APPROVED: 'request_approved',
  CANCELED: 'canceled',
};

export const RESOURCES = {
  PROJECT: 'project',
  PROJECT_TEMPLATE: 'project.template',
  PROJECT_TYPE: 'project.type',
  PROJECT_MEMBER: 'project.member',
  PROJECT_MEMBER_INVITE: 'project.member.invite',
  ORG_CONFIG: 'project.orgConfig',
  FORM_VERSION: 'project.form.version',
  FORM_REVISION: 'project.form.revision',
  PRICE_CONFIG_VERSION: 'project.priceConfig.version',
  PRICE_CONFIG_REVISION: 'project.priceConfig.revision',
  PLAN_CONFIG_VERSION: 'project.planConfig.version',
  PLAN_CONFIG_REVISION: 'project.planConfig.revision',
  PRODUCT_TEMPLATE: 'product.template',
  PRODUCT_CATEGORY: 'product.category',
  PHASE: 'project.phase',
  PHASE_PRODUCT: 'project.phase.product',
  TIMELINE: 'timeline',
  MILESTONE: 'milestone',
  MILESTONE_TEMPLATE: 'milestone.template',
  ATTACHMENT: 'project.attachment',
};
