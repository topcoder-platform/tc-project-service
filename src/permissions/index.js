

const Authorizer = require('tc-core-library-js').Authorizer;
const projectView = require('./project.view');
const projectEdit = require('./project.edit');
const projectDelete = require('./project.delete');
const projectMemberDelete = require('./projectMember.delete');
const projectAdmin = require('./admin.ops');
const projectAttachmentUpdate = require('./project.updateAttachment');
const projectAttachmentDownload = require('./project.downloadAttachment');
const connectManagerOrAdmin = require('./connectManagerOrAdmin.ops');
const copilotAndAbove = require('./copilotAndAbove');
const workManagementPermissions = require('./workManagementForTemplate');
const projectSettingEdit = require('./projectSetting.edit');

module.exports = () => {
  Authorizer.setDeniedStatusCode(403);

  // anyone can create a project
  Authorizer.setPolicy('project.create', true);
  Authorizer.setPolicy('project.view', projectView);
  Authorizer.setPolicy('project.edit', projectEdit);
  Authorizer.setPolicy('project.delete', projectDelete);
  Authorizer.setPolicy('project.addMember', projectView);
  Authorizer.setPolicy('project.viewMember', projectView);
  Authorizer.setPolicy('project.removeMember', projectMemberDelete);
  Authorizer.setPolicy('project.addAttachment', projectEdit);
  Authorizer.setPolicy('project.updateAttachment', projectAttachmentUpdate);
  Authorizer.setPolicy('project.removeAttachment', projectAttachmentUpdate);
  Authorizer.setPolicy('project.downloadAttachment', projectAttachmentDownload);
  Authorizer.setPolicy('project.listAttachment', projectView);
  Authorizer.setPolicy('project.updateMember', projectEdit);
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
  Authorizer.setPolicy('milestone.view', projectView);

  Authorizer.setPolicy('metadata.list', true); // anyone can view all metadata

  Authorizer.setPolicy('projectMemberInvite.create', projectView);
  Authorizer.setPolicy('projectMemberInvite.put', true);
  Authorizer.setPolicy('projectMemberInvite.get', true);
  Authorizer.setPolicy('projectMemberInvite.list', projectView);

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
};
