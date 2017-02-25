'use strict'
import {
  EVENT
} from '../constants'
import {
  projectCreatedHandler
} from './projects'
import {
  projectMemberAddedHandler,
  projectMemberRemovedHandler
} from './projectMembers'

export const handlers = {
  [EVENT.ROUTING_KEY.PROJECT_DRAFT_CREATED]: projectCreatedHandler,
  [EVENT.ROUTING_KEY.PROJECT_MEMBER_ADDED]: projectMemberAddedHandler,
  [EVENT.ROUTING_KEY.PROJECT_MEMBER_REMOVED]: projectMemberRemovedHandler
}
