// So that importing operation succeeds, models are added to list such that each model comes after its dependencies,
// So, when you add a new model to the list, make sure that its dependencies exist and come before it.
import models from '../../src/models';

const dataModels = [
  'ProjectTemplate',
  'ProductTemplate',
  'ProjectType',
  'ProductCategory',
  'MilestoneTemplate',
  'OrgConfig',
  'Form',
  'PlanConfig',
  'PriceConfig',
  'BuildingBlock',
  'Project',
  'ProjectPhase',
  'PhaseProduct',
  'ProjectAttachment',
  'ProjectMember',
  'ProjectMemberInvite',
];
/**
 * Validate that data models to be imported/exported are defined in model scope
 * @return {void}              Returns void
 */
function validateDataModels() {
  // Validate model names
  dataModels.forEach((modelName) => {
    if (!models[modelName]) {
      throw new Error(`Invalid model: ${modelName}`);
    }
  });
}
module.exports = { dataModels, validateDataModels };
