/**
 * User permission policies.
 * Can be used with `hasPermission` method.
 *
 * PERMISSION GUIDELINES
 *
 * All the permission name and meaning should define **WHAT** can be done having such permission
 * but not **WHO** can do it.
 *
 * Examples of CORRECT permission naming and meaning:
 *    - `READ_PROJECT`
 *    - `UPDATE_MILESTONE`
 *    - `DELETE_WORK`
 *
 * Examples of INCORRECT permissions naming and meaning:
 *    - `COPILOT_AND_MANAGER`
 *    - `PROJECT_MEMBERS`
 *    - `ADMINS`
 *
 * The same time **internally only** in this file, constants like `COPILOT_AND_ABOVE`,
 * `PROJECT_MEMBERS`, `ADMINS` could be used to define permissions.
 *
 * NAMING GUIDELINES
 *
 * There are unified prefixes to indicate what kind of permissions.
 * If no prefix is suitable, please, feel free to use a new prefix.
 *
 * CREATE_ - create somethings
 * READ_   - read something
 * UPDATE_ - update something
 * DELETE_ - delete something
 *
 * MANAGE_ - means combination of 3 operations CREATE/UPDATE/DELETE.
 *           usually should be used, when READ operation is allowed to everyone
 *           while 3 manage operations require additional permissions
 * ACCESS_ - means combination of all 4 operations READ/CREATE/UPDATE/DELETE.
 *           usually should be used, when by default users cannot even READ something
 *           and if someone can READ, then also can do other kind of operations.
 *
 * ANTI-PERMISSIONS
 *
 * If it's technically impossible to create permission rules for some situation in "allowed" manner,
 * in such case we can create permission rules, which would disallow somethings.
 * - Create such rules ONLY IF CREATING ALLOW RULE IS IMPOSSIBLE.
 * - Add a comment to such rules explaining why allow-rule cannot be created.
 */
import _ from 'lodash';
import {
  PROJECT_MEMBER_ROLE,
  USER_ROLE,
  ADMIN_ROLES as TOPCODER_ROLES_ADMINS,
  MANAGER_ROLES as TOPCODER_ROLES_MANAGERS_AND_ADMINS,
  M2M_SCOPES,
} from '../constants';

/**
 * All Project Roles
 */
const PROJECT_ROLES_ALL = _.values(PROJECT_MEMBER_ROLE);

/**
 * "Management Level" Project Roles
 */
const PROJECT_ROLES_MANAGEMENT = _.difference(PROJECT_ROLES_ALL, [
  PROJECT_MEMBER_ROLE.COPILOT,
  PROJECT_MEMBER_ROLE.CUSTOMER,
  PROJECT_MEMBER_ROLE.OBSERVER,
]);

/**
 * This is a special constant to indicate that all project members or any logged-in user
 * has permission.
 */
const ALL = true;

/**
 * M2M scopes to "read" projects
 */
const SCOPES_PROJECTS_READ = [
  M2M_SCOPES.CONNECT_PROJECT_ADMIN,
  M2M_SCOPES.PROJECTS.ALL,
  M2M_SCOPES.PROJECTS.READ,
];

/**
 * M2M scopes to "write" projects
 */
const SCOPES_PROJECTS_WRITE = [
  M2M_SCOPES.CONNECT_PROJECT_ADMIN,
  M2M_SCOPES.PROJECTS.ALL,
  M2M_SCOPES.PROJECTS.WRITE,
];

/**
 * M2M scopes to "write" billingAccountId property
 */
const SCOPES_PROJECTS_WRITE_BILLING_ACCOUNTS = [
  M2M_SCOPES.CONNECT_PROJECT_ADMIN,
  M2M_SCOPES.PROJECTS.WRITE_BILLING_ACCOUNTS,
];

/**
 * M2M scopes to "read" projects members
 */
const SCOPES_PROJECT_MEMBERS_READ = [
  M2M_SCOPES.CONNECT_PROJECT_ADMIN,
  M2M_SCOPES.PROJECT_MEMBERS.ALL,
  M2M_SCOPES.PROJECT_MEMBERS.READ,
];

/**
 * M2M scopes to "write" projects members
 */
const SCOPES_PROJECT_MEMBERS_WRITE = [
  M2M_SCOPES.CONNECT_PROJECT_ADMIN,
  M2M_SCOPES.PROJECT_MEMBERS.ALL,
  M2M_SCOPES.PROJECT_MEMBERS.WRITE,
];

const SCOPES_PROJECT_INVITES_READ = [
  M2M_SCOPES.CONNECT_PROJECT_ADMIN,
  M2M_SCOPES.PROJECT_INVITES.ALL,
  M2M_SCOPES.PROJECT_INVITES.READ,
];

const SCOPES_PROJECT_INVITES_WRITE = [
  M2M_SCOPES.CONNECT_PROJECT_ADMIN,
  M2M_SCOPES.PROJECT_INVITES.ALL,
  M2M_SCOPES.PROJECT_INVITES.WRITE,
];

/**
 * The full list of possible permission rules in Project Service
 */
export const PERMISSION = { // eslint-disable-line import/prefer-default-export
  /*
   * Project
   */
  CREATE_PROJECT: {
    meta: {
      title: 'Create Project',
      group: 'Project',
    },
    topcoderRoles: ALL,
    scopes: SCOPES_PROJECTS_WRITE,
  },

  CREATE_PROJECT_AS_MANAGER: {
    meta: {
      title: 'Create Project as a "manager"',
      group: 'Project',
      description: `When user creates a project they become a project member.
        If user has this permission they would join project with "${PROJECT_MEMBER_ROLE.MANAGER}"
        project role, otherwise with "${PROJECT_MEMBER_ROLE.CUSTOMER}".`,
    },
    topcoderRoles: TOPCODER_ROLES_MANAGERS_AND_ADMINS,
    scopes: SCOPES_PROJECTS_WRITE,
  },

  READ_PROJECT: {
    meta: {
      title: 'Read Project',
      group: 'Project',
      description: 'Read project when user is a member.',
    },
    topcoderRoles: [
      ...TOPCODER_ROLES_ADMINS,
      USER_ROLE.MANAGER,
    ],
    projectRoles: ALL,
    scopes: SCOPES_PROJECTS_READ,
  },

  READ_PROJECT_ANY: {
    meta: {
      title: 'Read Any Project',
      group: 'Project',
      description: 'Read any project, even when not a member.',
    },
    topcoderRoles: [
      ...TOPCODER_ROLES_ADMINS,
      USER_ROLE.MANAGER,
    ],
    scopes: SCOPES_PROJECTS_READ,
  },

  UPDATE_PROJECT: {
    meta: {
      title: 'Update Project',
      group: 'Project',
      description: 'There are additional limitations on editing some parts of the project.',
    },
    topcoderRoles: TOPCODER_ROLES_MANAGERS_AND_ADMINS,
    projectRoles: ALL,
    scopes: SCOPES_PROJECTS_WRITE,
  },

  MANAGE_PROJECT_DIRECT_PROJECT_ID: {
    meta: {
      title: 'Manage Project property "directProjectId"',
      group: 'Project',
      description: 'Who can set or update the "directProjectId" property.',
    },
    topcoderRoles: [
      USER_ROLE.MANAGER,
      USER_ROLE.TOPCODER_ADMIN,
    ],
    scopes: SCOPES_PROJECTS_WRITE,
  },

  MANAGE_PROJECT_BILLING_ACCOUNT_ID: {
    meta: {
      title: 'Manage Project property "billingAccountId"',
      group: 'Project',
      description: 'Who can set or update the "billingAccountId" property.',
    },
    topcoderRoles: [
      USER_ROLE.MANAGER,
      USER_ROLE.TOPCODER_ADMIN,
    ],
    scopes: SCOPES_PROJECTS_WRITE_BILLING_ACCOUNTS,
  },

  DELETE_PROJECT: {
    meta: {
      title: 'Delete Project',
      group: 'Project',
      description: 'Has different set of permission unlike to update.',
    },
    topcoderRoles: TOPCODER_ROLES_MANAGERS_AND_ADMINS,
    projectRoles: [
      // primary customer user, usually the one who created the project
      { role: PROJECT_MEMBER_ROLE.CUSTOMER, isPrimary: true },
      PROJECT_MEMBER_ROLE.MANAGER,
      PROJECT_MEMBER_ROLE.PROGRAM_MANAGER,
      PROJECT_MEMBER_ROLE.PROJECT_MANAGER,
      PROJECT_MEMBER_ROLE.SOLUTION_ARCHITECT,
    ],
    scopes: SCOPES_PROJECTS_WRITE,
  },

  /*
   * Project Member
   */
  READ_PROJECT_MEMBER: {
    meta: {
      title: 'Read Project Member',
      group: 'Project Member',
    },
    topcoderRoles: TOPCODER_ROLES_MANAGERS_AND_ADMINS,
    projectRoles: ALL,
    scopes: SCOPES_PROJECT_MEMBERS_READ,
  },

  READ_PROJECT_MEMBER_DETAILS: {
    meta: {
      title: 'Read Project Member Details',
      group: 'Project Member',
      description: 'Who can see user details (PII) like email, first name and last name.',
    },
    topcoderRoles: [
      USER_ROLE.TOPCODER_ADMIN,
    ],
    scopes: SCOPES_PROJECT_MEMBERS_READ,
  },

  CREATE_PROJECT_MEMBER_OWN: {
    meta: {
      title: 'Create Project Member (own)',
      group: 'Project Member',
      description: 'Who can add themselves as project members.',
    },
    topcoderRoles: TOPCODER_ROLES_MANAGERS_AND_ADMINS,
    scopes: SCOPES_PROJECT_MEMBERS_WRITE,
  },

  CREATE_PROJECT_MEMBER_NOT_OWN: {
    meta: {
      title: 'Create Project Member (not own)',
      group: 'Project Member',
      description: 'Who can add other users as project members.',
    },
    topcoderRoles: TOPCODER_ROLES_ADMINS,
    scopes: SCOPES_PROJECT_MEMBERS_WRITE,
  },

  UPDATE_PROJECT_MEMBER_CUSTOMER: {
    meta: {
      title: 'Update Project Member (customer)',
      group: 'Project Member',
      description: 'Who can update project members with "customer" role.',
    },
    topcoderRoles: TOPCODER_ROLES_ADMINS,
    projectRoles: ALL,
    scopes: SCOPES_PROJECT_MEMBERS_WRITE,
  },

  UPDATE_PROJECT_MEMBER_NON_CUSTOMER: {
    meta: {
      title: 'Update Project Member (non-customer)',
      group: 'Project Member',
      description: 'Who can update project members with non "customer" role.',
    },
    topcoderRoles: TOPCODER_ROLES_ADMINS,
    projectRoles: PROJECT_ROLES_MANAGEMENT,
    scopes: SCOPES_PROJECT_MEMBERS_WRITE,
  },

  DELETE_PROJECT_MEMBER_CUSTOMER: {
    meta: {
      title: 'Delete Project Member (customer)',
      group: 'Project Member',
      description: 'Who can delete project members with "customer" role.',
    },
    topcoderRoles: TOPCODER_ROLES_ADMINS,
    projectRoles: ALL,
    scopes: SCOPES_PROJECT_MEMBERS_WRITE,
  },

  DELETE_PROJECT_MEMBER_TOPCODER: {
    meta: {
      title: 'Delete Project Member (topcoder)',
      group: 'Project Member',
      description: 'Who can delete project members with some topcoder role like "manager" etc.',
    },
    topcoderRoles: TOPCODER_ROLES_ADMINS,
    projectRoles: PROJECT_ROLES_MANAGEMENT,
    scopes: SCOPES_PROJECT_MEMBERS_WRITE,
  },

  DELETE_PROJECT_MEMBER_COPILOT: {
    meta: {
      title: 'Delete Project Member (copilot)',
      group: 'Project Member',
      description: 'Who can delete project members with "copilot" role.',
    },
    topcoderRoles: [
      ...TOPCODER_ROLES_ADMINS,
      USER_ROLE.COPILOT_MANAGER,
    ],
    projectRoles: ALL,
    scopes: SCOPES_PROJECT_MEMBERS_WRITE,
  },

  /*
   * Project Invite
   */
  READ_PROJECT_INVITE_OWN: {
    meta: {
      title: 'Read Project Invite (own)',
      group: 'Project Invite',
      description: 'Who can view own invite.',
    },
    topcoderRoles: ALL,
    scopes: SCOPES_PROJECT_INVITES_READ,
  },

  READ_PROJECT_INVITE_NOT_OWN: {
    meta: {
      title: 'Read Project Invite (not own)',
      group: 'Project Invite',
      description: 'Who can view invites of other users.',
    },
    topcoderRoles: TOPCODER_ROLES_MANAGERS_AND_ADMINS,
    projectRoles: ALL,
    scopes: SCOPES_PROJECT_INVITES_READ,
  },

  CREATE_PROJECT_INVITE_CUSTOMER: {
    meta: {
      title: 'Create Project Invite (customer)',
      group: 'Project Invite',
      description: 'Who can invite project members with "customer" role.',
    },
    topcoderRoles: TOPCODER_ROLES_ADMINS,
    projectRoles: ALL,
    scopes: SCOPES_PROJECT_INVITES_WRITE,
  },

  CREATE_PROJECT_INVITE_TOPCODER: {
    meta: {
      title: 'Create Project Invite (topcoder)',
      group: 'Project Invite',
      description: 'Who can invite project members with topcoder role like "manager" etc.',
    },
    topcoderRoles: TOPCODER_ROLES_ADMINS,
    projectRoles: PROJECT_ROLES_MANAGEMENT,
    scopes: SCOPES_PROJECT_INVITES_WRITE,
  },

  CREATE_PROJECT_INVITE_COPILOT: {
    meta: {
      title: 'Create Project Invite (copilot)',
      group: 'Project Invite',
      description: 'Who can invite user with "copilot" role directly without requesting.',
    },
    topcoderRoles: [
      ...TOPCODER_ROLES_ADMINS,
      USER_ROLE.COPILOT_MANAGER,
    ],
    scopes: SCOPES_PROJECT_INVITES_WRITE,
  },

  UPDATE_PROJECT_INVITE_OWN: {
    meta: {
      title: 'Update Project Invite (own)',
      group: 'Project Invite',
      description: 'Who can update own invite.',
    },
    topcoderRoles: ALL,
    scopes: SCOPES_PROJECT_INVITES_WRITE,
  },

  UPDATE_PROJECT_INVITE_NOT_OWN: {
    meta: {
      title: 'Update Project Invite (not own)',
      group: 'Project Invite',
      description: 'Who can update invites for other members.',
    },
    topcoderRoles: TOPCODER_ROLES_ADMINS,
    scopes: SCOPES_PROJECT_INVITES_WRITE,
  },

  UPDATE_PROJECT_INVITE_REQUESTED: {
    meta: {
      title: 'Update Project Invite (requested)',
      group: 'Project Invite',
      description: 'Who can update requested invites.',
    },
    topcoderRoles: [
      ...TOPCODER_ROLES_ADMINS,
      USER_ROLE.COPILOT_MANAGER,
    ],
    scopes: SCOPES_PROJECT_INVITES_WRITE,
  },

  DELETE_PROJECT_INVITE_OWN: {
    meta: {
      title: 'Delete Project Member (own)',
      group: 'Project Invite',
      description: 'Who can delete own invite.',
    },
    topcoderRoles: ALL,
    scopes: SCOPES_PROJECT_INVITES_WRITE,
  },

  DELETE_PROJECT_INVITE_NOT_OWN_CUSTOMER: {
    meta: {
      title: 'Delete Project Invite (not own, customer)',
      group: 'Project Invite',
      description: 'Who can delete invites for other members with "customer" role.',
    },
    topcoderRoles: TOPCODER_ROLES_ADMINS,
    projectRoles: ALL,
    scopes: SCOPES_PROJECT_INVITES_WRITE,
  },

  DELETE_PROJECT_INVITE_NOT_OWN_TOPCODER: {
    meta: {
      title: 'Delete Project Invite (not own, topcoder)',
      group: 'Project Invite',
      description: 'Who can delete project invites for other members with some topcoder role like "manager" etc.',
    },
    topcoderRoles: TOPCODER_ROLES_ADMINS,
    projectRoles: PROJECT_ROLES_MANAGEMENT,
    scopes: SCOPES_PROJECT_INVITES_WRITE,
  },

  DELETE_PROJECT_INVITE_NOT_OWN_COPILOT: {
    meta: {
      title: 'Delete Project Invite (not own, copilot)',
      group: 'Project Invite',
      description: 'Who can delete invites for other members with "copilot" role.',
    },
    topcoderRoles: [
      ...TOPCODER_ROLES_ADMINS,
      USER_ROLE.COPILOT_MANAGER,
    ],
    projectRoles: PROJECT_ROLES_MANAGEMENT,
    scopes: SCOPES_PROJECT_INVITES_WRITE,
  },

  DELETE_PROJECT_INVITE_REQUESTED: {
    meta: {
      title: 'Delete Project Invite (requested)',
      group: 'Project Invite',
      description: 'Who can delete requested invites.',
    },
    topcoderRoles: [
      ...TOPCODER_ROLES_ADMINS,
      USER_ROLE.COPILOT_MANAGER,
    ],
    scopes: SCOPES_PROJECT_INVITES_WRITE,
  },

  /*
   * Project Attachments
   */
  CREATE_PROJECT_ATTACHMENT: {
    meta: {
      title: 'Create Project Attachment',
      group: 'Project Attachment',
    },
    topcoderRoles: TOPCODER_ROLES_MANAGERS_AND_ADMINS,
    projectRoles: ALL,
    scopes: SCOPES_PROJECTS_WRITE,
  },

  READ_PROJECT_ATTACHMENT_OWN_OR_ALLOWED: {
    meta: {
      title: 'Read Project Attachment (own or allowed)',
      group: 'Project Attachment',
      description: 'Who can view own attachment or an attachment of another user when they are in the "allowed" list.',
    },
    topcoderRoles: TOPCODER_ROLES_MANAGERS_AND_ADMINS,
    projectRoles: ALL,
    scopes: SCOPES_PROJECTS_READ,
  },

  READ_PROJECT_ATTACHMENT_NOT_OWN_AND_NOT_ALLOWED: {
    meta: {
      title: 'Read Project Attachment (not own and not allowed)',
      group: 'Project Attachment',
      description: 'Who can view attachment of another user when they are not in "allowed" users list.',
    },
    topcoderRoles: TOPCODER_ROLES_ADMINS,
    scopes: SCOPES_PROJECTS_READ,
  },

  UPDATE_PROJECT_ATTACHMENT_OWN: {
    meta: {
      title: 'Update Project Attachment (own)',
      group: 'Project Attachment',
      description: 'Who can edit attachment they created.',
    },
    topcoderRoles: TOPCODER_ROLES_MANAGERS_AND_ADMINS,
    projectRoles: ALL,
    scopes: SCOPES_PROJECTS_WRITE,
  },

  UPDATE_PROJECT_ATTACHMENT_NOT_OWN: {
    meta: {
      title: 'Update Project Attachment (not own)',
      group: 'Project Attachment',
      description: 'Who can edit attachment created by another user.',
    },
    topcoderRoles: TOPCODER_ROLES_ADMINS,
    scopes: SCOPES_PROJECTS_WRITE,
  },

  DELETE_PROJECT_ATTACHMENT_OWN: {
    meta: {
      title: 'Delete Project Attachment (own)',
      group: 'Project Attachment',
      description: 'Who can delete attachment they created.',
    },
    topcoderRoles: TOPCODER_ROLES_MANAGERS_AND_ADMINS,
    projectRoles: ALL,
    scopes: SCOPES_PROJECTS_WRITE,
  },

  DELETE_PROJECT_ATTACHMENT_NOT_OWN: {
    meta: {
      title: 'Delete Project Attachment (not own)',
      group: 'Project Attachment',
      description: 'Who can delete attachment created by another user.',
    },
    topcoderRoles: TOPCODER_ROLES_ADMINS,
    scopes: SCOPES_PROJECTS_WRITE,
  },

  /*
   * DEPRECATED - THIS PERMISSION RULE HAS TO BE REMOVED
   *
   * Permissions defined by logic: **WHO** can do actions with such a permission.
   */
  ROLES_COPILOT_AND_ABOVE: {
    meta: {
      group: 'Deprecated',
    },
    topcoderRoles: TOPCODER_ROLES_ADMINS,
    projectRoles: [
      ...PROJECT_ROLES_MANAGEMENT,
      PROJECT_MEMBER_ROLE.COPILOT,
    ],
  },
};

/**
 * Matrix which define Project Roles and corresponding Topcoder Roles of users
 * who may join with such Project Roles.
 */
export const PROJECT_TO_TOPCODER_ROLES_MATRIX = {
  [PROJECT_MEMBER_ROLE.CUSTOMER]: _.values(USER_ROLE),
  [PROJECT_MEMBER_ROLE.MANAGER]: [
    USER_ROLE.TOPCODER_ADMIN,
    USER_ROLE.CONNECT_ADMIN,
    USER_ROLE.MANAGER,
    USER_ROLE.TOPCODER_ACCOUNT_MANAGER,
    USER_ROLE.BUSINESS_DEVELOPMENT_REPRESENTATIVE,
    USER_ROLE.PRESALES,
    USER_ROLE.ACCOUNT_EXECUTIVE,
    USER_ROLE.PROGRAM_MANAGER,
    USER_ROLE.SOLUTION_ARCHITECT,
    USER_ROLE.PROJECT_MANAGER,
    USER_ROLE.COPILOT_MANAGER,
  ],
  [PROJECT_MEMBER_ROLE.COPILOT]: [
    USER_ROLE.COPILOT,
  ],
};

/**
 * This list determines default Project Role by Topcoder Role.
 *
 * - The order of items in this list is IMPORTANT.
 * - To determine default Project Role we have to go from TOP to END
 *   and find the first record which has the Topcoder Role of the user.
 * - Always define default Project Role which is allowed for such Topcoder Role
 *   as per `PROJECT_TO_TOPCODER_ROLES_MATRIX`
 */
export const DEFAULT_PROJECT_ROLE = [
  {
    topcoderRole: USER_ROLE.MANAGER,
    projectRole: PROJECT_MEMBER_ROLE.MANAGER,
  }, {
    topcoderRole: USER_ROLE.COPILOT_MANAGER,
    projectRole: PROJECT_MEMBER_ROLE.MANAGER,
  }, {
    topcoderRole: USER_ROLE.CONNECT_ADMIN,
    projectRole: PROJECT_MEMBER_ROLE.MANAGER,
  }, {
    topcoderRole: USER_ROLE.TOPCODER_ADMIN,
    projectRole: PROJECT_MEMBER_ROLE.MANAGER,
  }, {
    topcoderRole: USER_ROLE.TOPCODER_ACCOUNT_MANAGER,
    projectRole: PROJECT_MEMBER_ROLE.MANAGER,
  }, {
    topcoderRole: USER_ROLE.BUSINESS_DEVELOPMENT_REPRESENTATIVE,
    projectRole: PROJECT_MEMBER_ROLE.MANAGER,
  }, {
    topcoderRole: USER_ROLE.PRESALES,
    projectRole: PROJECT_MEMBER_ROLE.MANAGER,
  }, {
    topcoderRole: USER_ROLE.COPILOT,
    projectRole: PROJECT_MEMBER_ROLE.COPILOT,
  }, {
    topcoderRole: USER_ROLE.ACCOUNT_EXECUTIVE,
    projectRole: PROJECT_MEMBER_ROLE.MANAGER,
  }, {
    topcoderRole: USER_ROLE.PROGRAM_MANAGER,
    projectRole: PROJECT_MEMBER_ROLE.MANAGER,
  }, {
    topcoderRole: USER_ROLE.SOLUTION_ARCHITECT,
    projectRole: PROJECT_MEMBER_ROLE.MANAGER,
  }, {
    topcoderRole: USER_ROLE.PROJECT_MANAGER,
    projectRole: PROJECT_MEMBER_ROLE.MANAGER,
  }, {
    topcoderRole: USER_ROLE.TOPCODER_USER,
    projectRole: PROJECT_MEMBER_ROLE.CUSTOMER,
  },
];
