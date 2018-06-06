

const Authorizer = require('tc-core-library-js').Authorizer;
const projectView = require('./project.view');
const projectEdit = require('./project.edit');
const projectDelete = require('./project.delete');
const projectMemberDelete = require('./projectMember.delete');
const projectAdmin = require('./admin.ops');
const connectManagerOrAdmin = require('./connectManagerOrAdmin.ops');

module.exports = () => {
  Authorizer.setDeniedStatusCode(403);

  // anyone can create a project
  Authorizer.setPolicy('project.create', true);
  Authorizer.setPolicy('project.view', projectView);
  Authorizer.setPolicy('project.edit', projectEdit);
  Authorizer.setPolicy('project.delete', projectDelete);
  Authorizer.setPolicy('project.addMember', projectView);
  Authorizer.setPolicy('project.removeMember', projectMemberDelete);
  Authorizer.setPolicy('project.addAttachment', projectEdit);
  Authorizer.setPolicy('project.updateAttachment', projectEdit);
  Authorizer.setPolicy('project.removeAttachment', projectEdit);
  Authorizer.setPolicy('project.downloadAttachment', projectView);
  Authorizer.setPolicy('project.updateMember', projectEdit);
  Authorizer.setPolicy('project.admin', projectAdmin);

  Authorizer.setPolicy('projectTemplate.create', connectManagerOrAdmin);
  Authorizer.setPolicy('projectTemplate.edit', connectManagerOrAdmin);
  Authorizer.setPolicy('projectTemplate.delete', connectManagerOrAdmin);
  Authorizer.setPolicy('projectTemplate.view', true);

  Authorizer.setPolicy('productTemplate.create', connectManagerOrAdmin);
  Authorizer.setPolicy('productTemplate.edit', connectManagerOrAdmin);
  Authorizer.setPolicy('productTemplate.delete', connectManagerOrAdmin);
  Authorizer.setPolicy('productTemplate.view', true);

  Authorizer.setPolicy('milestoneTemplate.create', connectManagerOrAdmin);
  Authorizer.setPolicy('milestoneTemplate.edit', connectManagerOrAdmin);
  Authorizer.setPolicy('milestoneTemplate.delete', connectManagerOrAdmin);
  Authorizer.setPolicy('milestoneTemplate.view', true);

  Authorizer.setPolicy('project.addProjectPhase', projectEdit);
  Authorizer.setPolicy('project.updateProjectPhase', projectEdit);
  Authorizer.setPolicy('project.deleteProjectPhase', projectEdit);
  Authorizer.setPolicy('project.addPhaseProduct', projectEdit);
  Authorizer.setPolicy('project.updatePhaseProduct', projectEdit);
  Authorizer.setPolicy('project.deletePhaseProduct', projectEdit);

  Authorizer.setPolicy('projectType.create', projectAdmin);
  Authorizer.setPolicy('projectType.edit', projectAdmin);
  Authorizer.setPolicy('projectType.delete', projectAdmin);
  Authorizer.setPolicy('projectType.view', true); // anyone can view project types

  Authorizer.setPolicy('timeline.create', projectEdit);
  Authorizer.setPolicy('timeline.edit', projectEdit);
  Authorizer.setPolicy('timeline.delete', projectEdit);
  Authorizer.setPolicy('timeline.view', projectView);

  Authorizer.setPolicy('milestone.create', projectEdit);
  Authorizer.setPolicy('milestone.edit', projectEdit);
  Authorizer.setPolicy('milestone.delete', projectEdit);
  Authorizer.setPolicy('milestone.view', projectView);
};
