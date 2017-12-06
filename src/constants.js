
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
  TOPCODER_ADMIN : 'administrator',
  MANAGER        : 'Connect Manager',
  COPILOT        : 'Connect Copilot',
  CONNECT_ADMIN  : 'Connect Admin'
};


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
