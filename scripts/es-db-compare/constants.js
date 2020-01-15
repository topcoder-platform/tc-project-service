/*
 * Constants used in the script
 */

module.exports = {
  // currently support only a subset of jsonpath notations
  // "*" means any index number
  ignoredPaths: [
    'project.projectUrl',
    'project.utm',

    'project.deletedAt',
    'project.phases[*].deletedAt',
    'project.phases[*].products[*].deletedAt',
    'project.invites[*].deletedAt',
    'project.members[*].deletedAt',
    'project.attachments[*].deletedAt',

    'project.updatedAt',
    'project.phases[*].updatedAt',
    'project.phases[*].products[*].updatedAt',
    'project.invites[*].updatedAt',
    'project.members[*].updatedAt',
    'project.attachments[*].updatedAt',

    'project.deletedBy',
    'project.phases[*].deletedBy',
    'project.phases[*].products[*].deletedBy',
    'project.invites[*].deletedBy',
    'project.members[*].deletedBy',
    'project.attachments[*].deletedBy',
  ]
};
