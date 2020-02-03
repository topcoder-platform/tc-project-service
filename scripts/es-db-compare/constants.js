/*
 * Constants used in the script
 */

module.exports = {
  // currently support only a subset of jsonpath notations
  // "*" means any index number
  ignoredPaths: [
    // all project updatedAt (good to set for local verification)
    // 'project.updatedAt',
    // 'project.phases[*].updatedAt',
    // 'project.phases[*].products[*].updatedAt',
    // 'project.phases[*].products[*].timeline.updatedAt',
    // 'project.phases[*].products[*].timeline.milestones[*].updatedAt',
    // 'project.invites[*].updatedAt',
    // 'project.members[*].updatedAt',
    // 'project.attachments[*].updatedAt',

    // all project deletedAt
    'project.deletedAt',
    'project.phases[*].deletedAt',
    'project.phases[*].products[*].deletedAt',
    'project.phases[*].products[*].timeline.deletedAt',
    'project.phases[*].products[*].timeline.milestones[*].deletedAt',
    'project.invites[*].deletedAt',
    'project.members[*].deletedAt',
    'project.attachments[*].deletedAt',

    // all project deletedBy
    'project.deletedBy',
    'project.phases[*].deletedBy',
    'project.phases[*].products[*].deletedBy',
    'project.phases[*].products[*].timeline.deletedBy',
    'project.phases[*].products[*].timeline.milestones[*].deletedBy',
    'project.invites[*].deletedBy',
    'project.members[*].deletedBy',
    'project.attachments[*].deletedBy',

    // all metadata updatedAt (good to set for local verification)
    // 'metadata.projectTemplates.updatedAt',
    // 'metadata.productTemplates.updatedAt',
    // 'metadata.projectTypes.updatedAt',
    // 'metadata.productCategories.updatedAt',
    // 'metadata.milestoneTemplates.updatedAt',
    // 'metadata.orgConfigs.updatedAt',
    // 'metadata.forms.updatedAt',
    // 'metadata.planConfigs.updatedAt',
    // 'metadata.priceConfigs.updatedAt',
    // 'metadata.buildingBlocks.updatedAt',

    // all metadata deletedAt
    'metadata.projectTemplates.deletedAt',
    'metadata.productTemplates.deletedAt',
    'metadata.projectTypes.deletedAt',
    'metadata.productCategories.deletedAt',
    'metadata.milestoneTemplates.deletedAt',
    'metadata.orgConfigs.deletedAt',
    'metadata.forms.deletedAt',
    'metadata.planConfigs.deletedAt',
    'metadata.priceConfigs.deletedAt',
    'metadata.buildingBlocks.deletedAt',

    // all metadata deletedBy
    'metadata.projectTemplates.deletedBy',
    'metadata.productTemplates.deletedBy',
    'metadata.projectTypes.deletedBy',
    'metadata.productCategories.deletedBy',
    'metadata.milestoneTemplates.deletedBy',
    'metadata.orgConfigs.deletedBy',
    'metadata.forms.deletedBy',
    'metadata.planConfigs.deletedBy',
    'metadata.priceConfigs.deletedBy',
    'metadata.buildingBlocks.deletedBy',
  ],
  associations: {
    metadata: {
      projectTemplates: 'ProjectTemplate',
      productTemplates: 'ProductTemplate',
      projectTypes: 'ProjectType',
      productCategories: 'ProductCategory',
      milestoneTemplates: 'MilestoneTemplate',
      orgConfigs: 'OrgConfig',
      forms: 'Form',
      planConfigs: 'PlanConfig',
      priceConfigs: 'PriceConfig',
      buildingBlocks: 'BuildingBlock',
    },

    projects: {
      phases: 'Phase',
      members: 'Member',
      invites: 'Invite',
      attachments: 'Attachment',
      timelines: 'Timeline',
    },
  },
};
