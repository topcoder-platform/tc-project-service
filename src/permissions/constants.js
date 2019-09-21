/**
 * Definitions of permissions which could be used with util methods
 * `util.hasPermission` or `util.hasPermissionForProject`.
 *
 * We can define permission using two logics:
 * 1. **WHAT** can be done with such a permission. Such constants may have names like:
 *    - `VIEW_PROJECT`
 *    - `EDIT_MILESTONE`
 *    - `DELETE_WORK`
 *    and os on.
 * 2. **WHO** can do actions with such a permission. Such constants **MUST** start from the prefix `ROLES_`, examples:
 *    - `ROLES_COPILOT_AND_ABOVE`
 *    - `ROLES_PROJECT_MEMBERS`
 *    - `ROLES_ADMINS`
 */
import {
  PROJECT_MEMBER_ROLE,
  ADMIN_ROLES,
} from '../constants';

export const PERMISSION = { // eslint-disable-line import/prefer-default-export
  /**
   * Permissions defined by logic: **WHO** can do actions with such a permission.
   */
  ROLES_COPILOT_AND_ABOVE: {
    topcoderRoles: ADMIN_ROLES,
    projectRoles: [
      PROJECT_MEMBER_ROLE.PROGRAM_MANAGER,
      PROJECT_MEMBER_ROLE.SOLUTION_ARCHITECT,
      PROJECT_MEMBER_ROLE.PROJECT_MANAGER,
      PROJECT_MEMBER_ROLE.MANAGER,
      PROJECT_MEMBER_ROLE.COPILOT,
    ],
  },
  /**
   * Permissions defined by logic: **WHAT** can be done with such a permission.
   */
};

