
export const PROJECT_TYPE = {
  APP_DEV: 'app_dev',
  GENERIC: 'generic',
  VISUAL_PROTOTYPE: 'visual_prototype',
  VISUAL_DESIGN: 'visual_design',
  WEBSITE: 'website',
  APP: 'app',
  QUALITY_ASSURANCE: 'quality_assurance',
  CHATBOT: 'chatbot',
};

export const PROJECT_STATUS = {
  DRAFT: 'draft',
  IN_REVIEW: 'in_review',
  REVIEWED: 'reviewed',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  PAUSED: 'paused',
  CANCELLED: 'cancelled',
};

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
};

export const REGEX = {
  URL: /^(http(s?):\/\/)?(www\.)?[a-zA-Z0-9\.\-\_]+(\.[a-zA-Z]{2,15})+(\:[0-9]{2,5})?(\/[a-zA-Z0-9\_\-\s\.\/\?\%\#\&\=;]*)?$/, // eslint-disable-line
};
