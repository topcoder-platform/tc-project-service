

const Authorizer = require('tc-core-library-js').Authorizer;
const projectView = require('./project.view');
const projectEdit = require('./project.edit');
const projectDelete = require('./project.delete');
const projectMemberDelete = require('./projectMember.delete');
const projectAdmin = require('./admin.ops');
// const connectManagerOrAdmin = require('./connectManagerOrAdmin.ops');
const copilotAndAbove = require('./copilotAndAbove');

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

  Authorizer.setPolicy('projectTemplate.create', projectAdmin);
  Authorizer.setPolicy('projectTemplate.edit', projectAdmin);
  Authorizer.setPolicy('projectTemplate.delete', projectAdmin);
  Authorizer.setPolicy('projectTemplate.view', true);

  Authorizer.setPolicy('productTemplate.create', projectAdmin);
  Authorizer.setPolicy('productTemplate.edit', projectAdmin);
  Authorizer.setPolicy('productTemplate.delete', projectAdmin);
  Authorizer.setPolicy('productTemplate.view', true);

  Authorizer.setPolicy('project.addProjectPhase', copilotAndAbove);
  Authorizer.setPolicy('project.updateProjectPhase', copilotAndAbove);
  Authorizer.setPolicy('project.deleteProjectPhase', copilotAndAbove);
  Authorizer.setPolicy('project.addPhaseProduct', copilotAndAbove);
  Authorizer.setPolicy('project.updatePhaseProduct', copilotAndAbove);
  Authorizer.setPolicy('project.deletePhaseProduct', copilotAndAbove);

  Authorizer.setPolicy('milestoneTemplate.create', connectManagerOrAdmin);
  Authorizer.setPolicy('milestoneTemplate.edit', connectManagerOrAdmin);
  Authorizer.setPolicy('milestoneTemplate.delete', connectManagerOrAdmin);
  Authorizer.setPolicy('milestoneTemplate.view', true);

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
