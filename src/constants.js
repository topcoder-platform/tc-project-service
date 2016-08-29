
export const PROJECT_TYPE = {
  APP_DEV          : 'app_dev',
  GENERIC          : 'generic',
  VISUAL_PROTOTYPE : 'visual_prototype',
  VISUAL_DESIGN    : 'visual_design'
}

export const PROJECT_STATUS = {
  DRAFT            : 'draft',
  IN_REVIEW        : 'in_review',
  REVIEWED         : 'reviewed',
  ACTIVE           : 'active',
  COMPLETED        : 'completed',
  PAUSED           : 'paused',
  CANCELLED        : 'cancelled'
}

export const PROJECT_MEMBER_ROLE = {
  MANAGER          : 'manager',
  CUSTOMER         : 'customer',
  COPILOT          : 'copilot'
}

export const USER_ROLE = {
  TOPCODER_ADMIN: 'administrator',
  MANAGER: 'Manager',
  COPILOT: 'Connect Copilot'
}


export const EVENT = {
  INTERNAL: {
    PROJECT_MEMBER_ADDED: 'internal.project.member.added',
    PROJECT_MEMBER_REMOVED: 'internal.project.member.removed',

    PROJECT_DRAFT_CREATED: 'internal.project.draft-created',
    PROJECT_LAUNCHED: 'internal.project.launched',
    PROJECT_UPDATED: 'internal.project.updated',
    PROJECT_CANCELLED: 'internal.project.cancelled',
    PROJECT_COMPLETED: 'internal.project.completed'
  },

  EXTERNAL: {
    PROJECT_MEMBER_ADDED: 'external.project.member.added',
    PROJECT_MEMBER_REMOVED: 'external.project.member.removed',

    PROJECT_DRAFT_CREATED: 'external.project.draft-created',
    PROJECT_LAUNCHED: 'external.project.launched',
    PROJECT_UPDATED: 'external.project.updated',
    PROJECT_CANCELLED: 'external.project.cancelled',
    PROJECT_COMPLETED: 'external.project.completed'
  },

}
