/* eslint-disable no-param-reassign, no-restricted-syntax, no-await-in-loop */
/**
 * Temporary script to fix metadata in DB to be indexed in ES
 *
 * Update all records in the ProjectTemplate table.
 * - inside “scope” field update “buildingBlocks.<KEY>.price” (for any <KEY>) to be a string if it’s not a string.
 * - inside “scope” field replace all the ‘“wizard”: true’ with ‘“wizard”: {“enabled”: true}’,
 *   and ‘“wizard”: false’ replace with ‘“wizard”: {“enabled”: false}’.
 * Update all records in the ProductTemplate table.
 * - inside "template" field update all "required" properties which is not of "boolean" type to boolean.
 */
import _ from 'lodash';
import models from '../models';

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
 * Fix all projectTemplates.
 *
 * @param {Object} logger logger
 *
 * @returns {Promise} resolved when dene
 */
async function fixProjectTemplates(logger) {
  const projectTemplates = await models.ProjectTemplate.findAll();
  for (const projectTemplate of projectTemplates) {
    if (projectTemplate.scope) {
      const updatedScope = updateScope(JSON.parse(JSON.stringify(projectTemplate.scope)));
      if (!_.isEqual(updatedScope, projectTemplate.scope)) {
        projectTemplate.scope = updatedScope;
        await projectTemplate.save();
        logger.info(`updated record of ProjectTemplate with id ${projectTemplate.id}`);
      }
    }
  }
}

/**
 * Update the required property of an object.
 *
 * @param {Object} data any object
 *
 * @returns {undefined}
 */
function updateRequiredProperty(data) {
  if (typeof data.required !== 'undefined' && typeof data.required !== 'boolean') {
    if (data.required === 'false') {
      data.required = false;
    } else if (data.required === 'true') {
      data.required = true;
    } else {
      throw new Error(`"required" value ${data.required} cannot be converted to boolean.`);
    }
  }
}

/**
 * Update the template property of a productTemplate.
 *
 * @param {Object} template the template property
 * @returns {Object} the updated template
 */
function updateTemplate(template) {
  // update wizard properties
  updateRequiredProperty(template);
  if (template.sections) {
    for (const section of template.sections) {
      updateRequiredProperty(section);
      if (section.subSections) {
        for (const subSection of section.subSections) {
          updateRequiredProperty(subSection);
          if (subSection.questions) {
            for (const question of subSection.questions) {
              updateRequiredProperty(question);
            }
          }
        }
      }
    }
  }
  return template;
}

/**
 * Fix all productTemplates.
 *
 * @param {Object} logger logger
 *
 * @returns {Promise} resolved when dene
 */
async function fixProductTemplates(logger) {
  const productTemplates = await models.ProductTemplate.findAll();

  for (const productTemplate of productTemplates) {
    if (productTemplate.template) {
      const updatedTemplate = updateTemplate(JSON.parse(JSON.stringify(productTemplate.template)));
      if (!_.isEqual(updatedTemplate, productTemplate.template)) {
        productTemplate.template = updatedTemplate;
        await productTemplate.save();
        logger.info(`updated record of ProductTemplate with id ${productTemplate.id}`);
      }
    }
  }
}

/**
 * Fix all metadata models.
 *
 * @param {Object} logger logger
 *
 * @returns {undefined}
 */
async function fixMetadataForES(logger) {
  await fixProjectTemplates(logger);
  await fixProductTemplates(logger);
}

module.exports = fixMetadataForES;
