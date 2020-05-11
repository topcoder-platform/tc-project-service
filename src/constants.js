
export const PROJECT_STATUS = {
  DRAFT: 'draft',
  IN_REVIEW: 'in_review',
  REVIEWED: 'reviewed',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  PAUSED: 'paused',
  CANCELLED: 'cancelled',
};

export const WORKSTREAM_STATUS = {
  DRAFT: 'draft',
  REVIEWED: 'reviewed',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  PAUSED: 'paused',
};
export const PROJECT_PHASE_STATUS = PROJECT_STATUS;

export const MILESTONE_STATUS = PROJECT_STATUS;

export const PROJECT_MEMBER_ROLE = {
  MANAGER: 'manager',
  OBSERVER: 'observer',
  CUSTOMER: 'customer',
  COPILOT: 'copilot',
  ACCOUNT_MANAGER: 'account_manager',
  PROGRAM_MANAGER: 'program_manager',
  ACCOUNT_EXECUTIVE: 'account_executive',
  SOLUTION_ARCHITECT: 'solution_architect',
  PROJECT_MANAGER: 'project_manager',
};

export const PROJECT_MEMBER_MANAGER_ROLES = [
  PROJECT_MEMBER_ROLE.MANAGER,
  PROJECT_MEMBER_ROLE.OBSERVER,
  PROJECT_MEMBER_ROLE.ACCOUNT_MANAGER,
  PROJECT_MEMBER_ROLE.ACCOUNT_EXECUTIVE,
  PROJECT_MEMBER_ROLE.PROJECT_MANAGER,
  PROJECT_MEMBER_ROLE.PROGRAM_MANAGER,
  PROJECT_MEMBER_ROLE.SOLUTION_ARCHITECT,
];

export const PROJECT_MEMBER_NON_CUSTOMER_ROLES = [
  PROJECT_MEMBER_ROLE.MANAGER,
  PROJECT_MEMBER_ROLE.COPILOT,
  PROJECT_MEMBER_ROLE.ACCOUNT_MANAGER,
  PROJECT_MEMBER_ROLE.ACCOUNT_EXECUTIVE,
  PROJECT_MEMBER_ROLE.PROJECT_MANAGER,
  PROJECT_MEMBER_ROLE.PROGRAM_MANAGER,
  PROJECT_MEMBER_ROLE.SOLUTION_ARCHITECT,
];

export const USER_ROLE = {
  TOPCODER_ADMIN: 'administrator',
  MANAGER: 'Connect Manager',
  TOPCODER_ACCOUNT_MANAGER: 'Connect Account Manager',
  COPILOT: 'Connect Copilot',
  CONNECT_ADMIN: 'Connect Admin',
  COPILOT_MANAGER: 'Connect Copilot Manager',
  BUSINESS_DEVELOPMENT_REPRESENTATIVE: 'Business Development Representative',
  PRESALES: 'Presales',
  ACCOUNT_EXECUTIVE: 'Account Executive',
  PROGRAM_MANAGER: 'Program Manager',
  SOLUTION_ARCHITECT: 'Solution Architect',
  PROJECT_MANAGER: 'Project Manager',
  TOPCODER_USER: 'Topcoder User',
};

export const ADMIN_ROLES = [USER_ROLE.CONNECT_ADMIN, USER_ROLE.TOPCODER_ADMIN];

export const MANAGER_ROLES = [
  ...ADMIN_ROLES,
  USER_ROLE.MANAGER,
  USER_ROLE.TOPCODER_ACCOUNT_MANAGER,
  USER_ROLE.COPILOT_MANAGER,
  USER_ROLE.BUSINESS_DEVELOPMENT_REPRESENTATIVE,
  USER_ROLE.PRESALES,
  USER_ROLE.ACCOUNT_EXECUTIVE,

  USER_ROLE.PROGRAM_MANAGER,
  USER_ROLE.SOLUTION_ARCHITECT,
  USER_ROLE.PROJECT_MANAGER,
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
  PROJECT_CREATED: 'project.action.create',
  PROJECT_UPDATED: 'project.action.update',
  PROJECT_DELETED: 'project.action.delete',

  PROJECT_MEMBER_ADDED: 'project.action.create',
  PROJECT_MEMBER_REMOVED: 'project.action.delete',
  PROJECT_MEMBER_UPDATED: 'project.action.update',

  PROJECT_ATTACHMENT_ADDED: 'project.action.create',
  PROJECT_ATTACHMENT_REMOVED: 'project.action.delete',
  PROJECT_ATTACHMENT_UPDATED: 'project.action.update',

  // When phase is added/updated/deleted from the project,
  // When product is added/deleted from a phase
  // When product is updated on any field other than specification
  PROJECT_PHASE_CREATED: 'project.action.create',
  PROJECT_PHASE_UPDATED: 'project.action.update',
  PROJECT_PHASE_DELETED: 'project.action.delete',

  // phase product
  PROJECT_PHASE_PRODUCT_ADDED: 'project.action.create',
  PROJECT_PHASE_PRODUCT_UPDATED: 'project.action.update',
  PROJECT_PHASE_PRODUCT_REMOVED: 'project.action.delete',

  // timeline
  TIMELINE_CREATED: 'project.action.create',
  TIMELINE_UPDATED: 'project.action.update',
  TIMELINE_DELETED: 'project.action.delete',

  MILESTONE_ADDED: 'project.action.create',
  MILESTONE_REMOVED: 'project.action.delete',
  MILESTONE_UPDATED: 'project.action.update',

  MILESTONE_TEMPLATE_ADDED: 'project.action.create',
  MILESTONE_TEMPLATE_REMOVED: 'project.action.delete',
  MILESTONE_TEMPLATE_UPDATED: 'project.action.update',

  // Project Member Invites
  PROJECT_MEMBER_INVITE_CREATED: 'project.action.create',
  PROJECT_MEMBER_INVITE_UPDATED: 'project.action.update',
  PROJECT_MEMBER_INVITE_REMOVED: 'project.action.delete',

  // metadata
  PROJECT_METADATA_CREATE: 'project.action.create',
  PROJECT_METADATA_UPDATE: 'project.action.update',
  PROJECT_METADATA_DELETE: 'project.action.delete',
};

export const CONNECT_NOTIFICATION_EVENT = {
  PROJECT_CREATED: 'connect.notification.project.created',
  PROJECT_UPDATED: 'connect.notification.project.updated',
  PROJECT_SUBMITTED_FOR_REVIEW: 'connect.notification.project.submittedForReview',
  PROJECT_APPROVED: 'connect.notification.project.approved',
  PROJECT_PAUSED: 'connect.notification.project.paused',
  PROJECT_COMPLETED: 'connect.notification.project.completed',
  PROJECT_CANCELED: 'connect.notification.project.canceled',
  PROJECT_ACTIVE: 'connect.notification.project.active',

  PROJECT_PHASE_TRANSITION_ACTIVE: 'connect.notification.project.phase.transition.active',
  PROJECT_PHASE_TRANSITION_COMPLETED: 'connect.notification.project.phase.transition.completed',
  PROJECT_PHASE_UPDATE_PAYMENT: 'connect.notification.project.phase.update.payment',
  PROJECT_PHASE_UPDATE_PROGRESS: 'connect.notification.project.phase.update.progress',
  PROJECT_PHASE_UPDATE_SCOPE: 'connect.notification.project.phase.update.scope',

  PROJECT_WORK_TRANSITION_ACTIVE: 'connect.notification.project.work.transition.active',
  PROJECT_WORK_TRANSITION_COMPLETED: 'connect.notification.project.work.transition.completed',
  PROJECT_WORK_UPDATE_PAYMENT: 'connect.notification.project.work.update.payment',
  PROJECT_WORK_UPDATE_PROGRESS: 'connect.notification.project.work.update.progress',
  PROJECT_WORK_UPDATE_SCOPE: 'connect.notification.project.work.update.scope',

  MEMBER_JOINED: 'connect.notification.project.member.joined',
  MEMBER_LEFT: 'connect.notification.project.member.left',
  MEMBER_REMOVED: 'connect.notification.project.member.removed',
  MEMBER_ASSIGNED_AS_OWNER: 'connect.notification.project.member.assignedAsOwner',
  MEMBER_JOINED_COPILOT: 'connect.notification.project.member.copilotJoined',
  MEMBER_JOINED_MANAGER: 'connect.notification.project.member.managerJoined',

  PROJECT_LINK_CREATED: 'connect.notification.project.linkCreated',
  PROJECT_FILE_UPLOADED: 'connect.notification.project.fileUploaded',
  PROJECT_SPECIFICATION_MODIFIED: 'connect.notification.project.updated.spec',
  PROJECT_PROGRESS_MODIFIED: 'connect.notification.project.updated.progress',
  PROJECT_ATTACHMENT_UPDATED: 'connect.notification.project.attachment.updated',
  PROJECT_TEAM_UPDATED: 'connect.notification.project.team.updated',

  // When phase is added/updated/deleted from the project,
  // When product is added/deleted from a phase
  // When product is updated on any field other than specification
  PROJECT_PLAN_UPDATED: 'connect.notification.project.plan.updated',

  PROJECT_PLAN_READY: 'connect.notification.project.plan.ready',

  // When milestone is added/deleted to/from the phase,
  // When milestone is updated for duration/startDate/endDate/status
  TIMELINE_ADJUSTED: 'connect.notification.project.timeline.adjusted',

  // When specification of a product is modified
  PROJECT_PRODUCT_SPECIFICATION_MODIFIED: 'connect.notification.project.product.update.spec',

  // When specification of a work item is modified
  PROJECT_WORKITEM_SPECIFICATION_MODIFIED: 'connect.notification.project.workitem.update.spec',

  MILESTONE_ADDED: 'connect.notification.project.timeline.milestone.added',
  MILESTONE_REMOVED: 'connect.notification.project.timeline.milestone.removed',
  MILESTONE_UPDATED: 'connect.notification.project.timeline.milestone.updated',
  // When milestone is marked as active
  MILESTONE_TRANSITION_ACTIVE: 'connect.notification.project.timeline.milestone.transition.active',
  // When milestone is marked as completed
  MILESTONE_TRANSITION_COMPLETED: 'connect.notification.project.timeline.milestone.transition.completed',
  // When milestone is marked as paused
  MILESTONE_TRANSITION_PAUSED: 'connect.notification.project.timeline.milestone.transition.paused',
  // When milestone is waiting for customers's input
  MILESTONE_WAITING_CUSTOMER: 'connect.notification.project.timeline.milestone.waiting.customer',

  // Project Member Invites
  PROJECT_MEMBER_INVITE_CREATED: 'connect.notification.project.member.invite.created',
  PROJECT_MEMBER_INVITE_REQUESTED: 'connect.notification.project.member.invite.requested',
  PROJECT_MEMBER_INVITE_UPDATED: 'connect.notification.project.member.invite.updated',
  PROJECT_MEMBER_INVITE_APPROVED: 'connect.notification.project.member.invite.approved',
  PROJECT_MEMBER_INVITE_REJECTED: 'connect.notification.project.member.invite.rejected',
  PROJECT_MEMBER_EMAIL_INVITE_CREATED: 'connect.notification.email.project.member.invite.created',

  // TC Message Service events
  TOPIC_CREATED: 'connect.notification.project.topic.created',
  TOPIC_UPDATED: 'connect.notification.project.topic.updated',
  POST_CREATED: 'connect.notification.project.post.created',
  POST_UPDATED: 'connect.notification.project.post.edited',
};

export const REGEX = {
  URL: /^(http(s?):\/\/)?(www\.)?[a-zA-Z0-9\.\-\_]+(\.[a-zA-Z]{2,15})+(\:[0-9]{2,5})?(\/[a-zA-Z0-9\_\-\s\.\/\?\%\#\&\=;]*)?$/, // eslint-disable-line
};

export const M2M_SCOPES = {
  // for backward compatibility we should allow ALL M2M operations with `CONNECT_PROJECT_ADMIN`
  CONNECT_PROJECT_ADMIN: 'all:connect_project',
  PROJECTS: {
    ALL: 'all:projects',
    READ: 'read:projects',
    WRITE: 'write:projects',
    WRITE_BILLING_ACCOUNTS: 'write:projects-billing-accounts',
  },
  PROJECT_MEMBERS: {
    ALL: 'all:project-members',
    READ: 'read:project-members',
    WRITE: 'write:project-members',
  },
  PROJECT_INVITES: {
    ALL: 'all:project-invites',
    READ: 'read:project-invites',
    WRITE: 'write:project-invites',
  },
};

export const TIMELINE_REFERENCES = {
  PROJECT: 'project',
  PHASE: 'phase',
  PRODUCT: 'product',
  WORK: 'work',
};

export const STATUS_HISTORY_REFERENCES = {
  MILESTONE: 'milestone',
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

export const SCOPE_CHANGE_REQ_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  ACTIVATED: 'activated',
  CANCELED: 'canceled',
};
export const MAX_PARALLEL_REQUEST_QTY = 10;

export const ROUTES = {
  PHASE_PRODUCTS: {
    UPDATE: 'phase_products.update',
  },
  PHASES: {
    UPDATE: 'phases.update',
  },
  WORKS: {
    UPDATE: 'works.update',
  },
  WORK_ITEMS: {
    UPDATE: 'work_items.update',
  },
};

export const ESTIMATION_TYPE = {
  FEE: 'fee',
  COMMUNITY: 'community',
  TOPCODER_SERVICE: 'topcoder_service',
};

export const VALUE_TYPE = {
  INT: 'int',
  DOUBLE: 'double',
  STRING: 'string',
  PERCENTAGE: 'percentage',
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
  ATTACHMENT: 'attachment',
};

export const ATTACHMENT_TYPES = {
  FILE: 'file',
  LINK: 'link',
};
