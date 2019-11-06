/* eslint-disable no-console */
/* eslint-disable no-param-reassign */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
/**
 * Update all records in the ProjectTemplate table.
 * - inside “scope” field update “buildingBlocks.<KEY>.price” (for any <KEY>) to be a string if it’s not a string.
 * - inside “scope” field replace all the ‘“wizard”: true’ with ‘“wizard”: {“enabled”: true}’,
 *   and ‘“wizard”: false’ replace with ‘“wizard”: {“enabled”: false}’.
 */
import _ from 'lodash';
import models from '../src/models';

/**
 * Update the wizard property of an object.
 *
 * @param {Object} data any object
 * @returns {undefined}
 */
function updateWizardProperty(data) {
  if (typeof data.wizard === 'boolean') {
    data.wizard = { enabled: data.wizard };
  }
}

/**
 * Update the scope property of a projectTemplate.
 *
 * @param {Object} scope the scope property
 * @returns {Object} the updated scope
 */
function updateScope(scope) {
  // update price properties
  if (scope.buildingBlocks) {
    for (const key of Object.keys(scope.buildingBlocks)) {
      const price = scope.buildingBlocks[key].price;
      if (price !== undefined) {
        if (typeof price !== 'string') {
          scope.buildingBlocks[key].price = price.toString();
        }
      }
    }
  }
  // update wizard properties
  updateWizardProperty(scope);
  if (scope.sections) {
    for (const section of scope.sections) {
      updateWizardProperty(section);
      if (section.subSections) {
        for (const subSection of section.subSections) {
          updateWizardProperty(subSection);
        }
      }
    }
  }
  return scope;
}

/**
 * Update all projectTemplates.
 *
 * @returns {undefined}
 */
async function updateProjectTemplates() {
  const projectTemplates = await models.ProjectTemplate.findAll();
  for (const projectTemplate of projectTemplates) {
    if (projectTemplate.scope) {
      const updatedScope = updateScope(JSON.parse(JSON.stringify(projectTemplate.scope)));
      if (!_.isEqual(updatedScope, projectTemplate.scope)) {
        projectTemplate.scope = updatedScope;
        await projectTemplate.save();
        console.log(`updated record of ProjectTemplate with id ${projectTemplate.id}`);
      }
    }
  }
}

updateProjectTemplates()
  .then(() => {
    console.log('done!');
    process.exit();
  }).catch((err) => {
    console.error('Error syncing database', err);
    process.exit(1);
  });
