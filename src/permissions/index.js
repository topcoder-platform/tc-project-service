

const Authorizer = require('tc-core-library-js').Authorizer;
const projectView = require('./project.view');
const projectEdit = require('./project.edit');
const projectAdmin = require('./admin.ops');
const connectManagerOrAdmin = require('./connectManagerOrAdmin.ops');
const copilotAndAbove = require('./copilotAndAbove');
const workManagementPermissions = require('./workManagementForTemplate');
const projectSettingEdit = require('./projectSetting.edit');

const generalPermission = require('./generalPermission');
const { PERMISSION } = require('./constants');

module.exports = () => {
  Authorizer.setDeniedStatusCode(403);

  Authorizer.setPolicy('project.create', generalPermission(PERMISSION.CREATE_PROJECT));
  Authorizer.setPolicy('project.view', generalPermission(PERMISSION.READ_PROJECT));
  Authorizer.setPolicy('project.edit', generalPermission(PERMISSION.UPDATE_PROJECT));
  Authorizer.setPolicy('project.delete', generalPermission(PERMISSION.DELETE_PROJECT));

  Authorizer.setPolicy('projectMember.create', generalPermission([
    PERMISSION.CREATE_PROJECT_MEMBER_OWN,
    PERMISSION.CREATE_PROJECT_MEMBER_NOT_OWN,
  ]));
  Authorizer.setPolicy('projectMember.view', generalPermission(PERMISSION.READ_PROJECT_MEMBER));
  Authorizer.setPolicy('projectMember.edit', generalPermission([
    PERMISSION.UPDATE_PROJECT_MEMBER_CUSTOMER,
    PERMISSION.UPDATE_PROJECT_MEMBER_NON_CUSTOMER,
  ]));
  Authorizer.setPolicy('projectMember.delete', generalPermission([
    PERMISSION.DELETE_PROJECT_MEMBER_CUSTOMER,
    PERMISSION.DELETE_PROJECT_MEMBER_TOPCODER,
    PERMISSION.DELETE_PROJECT_MEMBER_COPILOT,
  ]));

  Authorizer.setPolicy('projectMemberInvite.create', generalPermission([
    PERMISSION.CREATE_PROJECT_INVITE_CUSTOMER,
    PERMISSION.CREATE_PROJECT_INVITE_TOPCODER,
    PERMISSION.CREATE_PROJECT_INVITE_COPILOT,
  ]));
  Authorizer.setPolicy('projectMemberInvite.view', generalPermission([
    PERMISSION.READ_PROJECT_INVITE_OWN,
    PERMISSION.READ_PROJECT_INVITE_NOT_OWN,
  ]));
  Authorizer.setPolicy('projectMemberInvite.edit', generalPermission([
    PERMISSION.UPDATE_PROJECT_INVITE_OWN,
    PERMISSION.UPDATE_PROJECT_INVITE_NOT_OWN,
  ]));
  Authorizer.setPolicy('projectMemberInvite.delete', generalPermission([
    PERMISSION.DELETE_PROJECT_INVITE_OWN,
    PERMISSION.DELETE_PROJECT_INVITE_NOT_OWN_CUSTOMER,
    PERMISSION.DELETE_PROJECT_INVITE_NOT_OWN_COPILOT,
    PERMISSION.DELETE_PROJECT_INVITE_NOT_OWN_TOPCODER,
  ]));

  Authorizer.setPolicy('projectAttachment.create', generalPermission(PERMISSION.CREATE_PROJECT_ATTACHMENT));
  Authorizer.setPolicy('projectAttachment.view', generalPermission([
    PERMISSION.READ_PROJECT_ATTACHMENT_OWN_OR_ALLOWED,
    PERMISSION.READ_PROJECT_ATTACHMENT_NOT_OWN_AND_NOT_ALLOWED,
  ]));
  Authorizer.setPolicy('projectAttachment.edit', generalPermission([
    PERMISSION.UPDATE_PROJECT_ATTACHMENT_OWN,
    PERMISSION.UPDATE_PROJECT_ATTACHMENT_NOT_OWN,
  ]));
  Authorizer.setPolicy('projectAttachment.delete', generalPermission([
    PERMISSION.DELETE_PROJECT_ATTACHMENT_OWN,
    PERMISSION.DELETE_PROJECT_ATTACHMENT_NOT_OWN,
  ]));

  Authorizer.setPolicy('project.admin', projectAdmin);

  Authorizer.setPolicy('projectTemplate.create', projectAdmin);
  Authorizer.setPolicy('projectTemplate.edit', projectAdmin);
  Authorizer.setPolicy('projectTemplate.delete', projectAdmin);
  Authorizer.setPolicy('projectTemplate.view', true);

  Authorizer.setPolicy('productTemplate.create', projectAdmin);
  Authorizer.setPolicy('productTemplate.edit', projectAdmin);
  Authorizer.setPolicy('productTemplate.upgrade', projectAdmin);
  Authorizer.setPolicy('productTemplate.delete', projectAdmin);
  Authorizer.setPolicy('projectTemplate.upgrade', projectAdmin);
  Authorizer.setPolicy('productTemplate.view', true);

  Authorizer.setPolicy('project.addProjectPhase', copilotAndAbove);
  Authorizer.setPolicy('project.updateProjectPhase', copilotAndAbove);
  Authorizer.setPolicy('project.deleteProjectPhase', copilotAndAbove);
  Authorizer.setPolicy('project.addPhaseProduct', copilotAndAbove);
  Authorizer.setPolicy('project.updatePhaseProduct', copilotAndAbove);
  Authorizer.setPolicy('project.deletePhaseProduct', copilotAndAbove);

  Authorizer.setPolicy('milestoneTemplate.clone', projectAdmin);
  Authorizer.setPolicy('milestoneTemplate.create', projectAdmin);
  Authorizer.setPolicy('milestoneTemplate.edit', projectAdmin);
  Authorizer.setPolicy('milestoneTemplate.delete', projectAdmin);
  Authorizer.setPolicy('milestoneTemplate.view', true);

  Authorizer.setPolicy('projectType.create', projectAdmin);
  Authorizer.setPolicy('projectType.edit', projectAdmin);
  Authorizer.setPolicy('projectType.delete', projectAdmin);
  Authorizer.setPolicy('projectType.view', true); // anyone can view project types

  Authorizer.setPolicy('orgConfig.create', projectAdmin);
  Authorizer.setPolicy('orgConfig.edit', projectAdmin);
  Authorizer.setPolicy('orgConfig.delete', projectAdmin);
  Authorizer.setPolicy('orgConfig.view', true); // anyone can view project types

  Authorizer.setPolicy('productCategory.create', projectAdmin);
  Authorizer.setPolicy('productCategory.edit', projectAdmin);
  Authorizer.setPolicy('productCategory.delete', projectAdmin);
  Authorizer.setPolicy('productCategory.view', true); // anyone can view product categories

  Authorizer.setPolicy('timeline.create', projectEdit);
  Authorizer.setPolicy('timeline.edit', projectEdit);
  Authorizer.setPolicy('timeline.delete', projectEdit);
  Authorizer.setPolicy('timeline.view', projectView);

  Authorizer.setPolicy('milestone.create', projectEdit);
  Authorizer.setPolicy('milestone.edit', projectEdit);
  Authorizer.setPolicy('milestone.delete', projectEdit);
  Authorizer.setPolicy('milestone.bulkUpdate', projectEdit);
  Authorizer.setPolicy('milestone.view', projectView);

  Authorizer.setPolicy('metadata.list', true); // anyone can view all metadata

  Authorizer.setPolicy('form.create', projectAdmin);
  Authorizer.setPolicy('form.edit', projectAdmin);
  Authorizer.setPolicy('form.delete', projectAdmin);
  Authorizer.setPolicy('form.view', true); // anyone can view form

  Authorizer.setPolicy('priceConfig.create', projectAdmin);
  Authorizer.setPolicy('priceConfig.edit', projectAdmin);
  Authorizer.setPolicy('priceConfig.delete', projectAdmin);
  Authorizer.setPolicy('priceConfig.view', true); // anyone can view plan config

  Authorizer.setPolicy('planConfig.create', projectAdmin);
  Authorizer.setPolicy('planConfig.edit', projectAdmin);
  Authorizer.setPolicy('planConfig.delete', projectAdmin);
  Authorizer.setPolicy('planConfig.view', true); // anyone can view price config

  // Work stream
  Authorizer.setPolicy('workStream.create', projectAdmin);
  Authorizer.setPolicy('workStream.edit', workManagementPermissions('workStream.edit'));
  Authorizer.setPolicy('workStream.delete', projectAdmin);
  Authorizer.setPolicy('workStream.view', projectView);

  // Work
  Authorizer.setPolicy('work.create', workManagementPermissions('work.create'));
  Authorizer.setPolicy('work.edit', workManagementPermissions('work.edit'));
  Authorizer.setPolicy('work.delete', workManagementPermissions('work.delete'));
  Authorizer.setPolicy('work.view', projectView);

  // Work item
  Authorizer.setPolicy('workItem.create', workManagementPermissions('workItem.create'));
  Authorizer.setPolicy('workItem.edit', workManagementPermissions('workItem.edit'));
  Authorizer.setPolicy('workItem.delete', workManagementPermissions('workItem.delete'));
  Authorizer.setPolicy('workItem.view', projectView);

  // Work management permission
  Authorizer.setPolicy('workManagementPermission.create', projectAdmin);
  Authorizer.setPolicy('workManagementPermission.edit', projectAdmin);
  Authorizer.setPolicy('workManagementPermission.delete', projectAdmin);
  Authorizer.setPolicy('workManagementPermission.view', projectAdmin);

  // Project Permissions
  Authorizer.setPolicy('permissions.view', projectView);

  // Project Settings
  Authorizer.setPolicy('projectSetting.create', connectManagerOrAdmin);
  Authorizer.setPolicy('projectSetting.edit', projectSettingEdit);
  Authorizer.setPolicy('projectSetting.delete', connectManagerOrAdmin);
  Authorizer.setPolicy('projectSetting.view', projectView);

  // Project Estimation Items
  Authorizer.setPolicy('projectEstimation.item.list', copilotAndAbove);

  // Project Reporting
  Authorizer.setPolicy('projectReporting.view', projectView);
};
