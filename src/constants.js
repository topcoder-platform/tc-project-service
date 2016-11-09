
import _ from 'lodash'
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
  MANAGER: 'Connect Manager',
  COPILOT: 'Connect Copilot'
}


export const EVENT = {
  ROUTING_KEY: {
    PROJECT_MEMBER_ADDED: 'project.member.added',
    PROJECT_MEMBER_REMOVED: 'project.member.removed',
    PROJECT_MEMBER_UPDATED: 'project.member.updated',

    PROJECT_DRAFT_CREATED: 'project.draft-created',
    PROJECT_LAUNCHED: 'project.launched',
    PROJECT_UPDATED: 'project.updated',
    PROJECT_CANCELLED: 'project.cancelled',
    PROJECT_COMPLETED: 'project.completed',
    PROJECT_DELETED: 'project.deleted'
  }
}
EVENT.INTERNAL = _.mapValues(EVENT.ROUTING_KEY, (a) => { return `internal.${a}` })
EVENT.EXTERNAL = _.mapValues(EVENT.ROUTING_KEY, (a) => { return `external.${a}` })
