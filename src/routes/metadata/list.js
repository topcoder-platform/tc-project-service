/**
 * API to list all metadata
 */
import { middleware as tcMiddleware } from 'tc-core-library-js';
import _ from 'lodash';
import Joi from 'joi';
import validate from 'express-validation';

import models from '../../models';
import util from '../../util';

const metadataProperties = [
  'productTemplates',
  'forms',
  'projectTemplates',
  'planConfigs',
  'priceConfigs',
  'projectTypes',
  'productCategories',
  'milestoneTemplates',
  'buildingBlocks',
];
const permissions = tcMiddleware.permissions;

const schema = {
  query: {
    includeAllReferred: Joi.boolean().optional(),
  },
};

/**
 * Found all form, planConfig, priceConfig latest version records
 *
 * @return {object} used model key/version map for project template
 */
function getUsedModel() {
  const modelUsed = {
    form: { },
    planConfig: { },
    priceConfig: { },
  };
  const query = {
    where: {
      deletedAt: { $eq: null },
      disabled: false,
    },
    attributes: { exclude: ['deletedAt', 'deletedBy'] },
    raw: true,
  };

  return Promise.all([
    models.ProjectTemplate.findAll(query),
    models.ProductTemplate.findAll(query),
  ]).then(([projectTemplates, productTemplates]) => {
    projectTemplates.forEach((template) => {
      const { form, planConfig, priceConfig } = template;
      if ((form) && (form.key) && (form.version)) {
        modelUsed.form[form.key] = modelUsed.form[form.key] ? modelUsed.form[form.key] : {};
        modelUsed.form[form.key][form.version] = true;
      }
      if ((priceConfig) && (priceConfig.key) && (priceConfig.version)) {
        modelUsed.priceConfig[priceConfig.key] = modelUsed.priceConfig[priceConfig.key] ?
          modelUsed.priceConfig[priceConfig.key] : {};
        modelUsed.priceConfig[priceConfig.key][priceConfig.version] = true;
      }
      if ((planConfig) && (planConfig.key) && (planConfig.version)) {
        modelUsed.planConfig[planConfig.key] = modelUsed.planConfig[planConfig.key] ?
          modelUsed.planConfig[planConfig.key] : {};
        modelUsed.planConfig[planConfig.key][planConfig.version] = true;
      }
    });

    productTemplates.forEach((template) => {
      const { form } = template;
      if ((form) && (form.key) && (form.version)) {
        modelUsed.form[form.key] = modelUsed.form[form.key] ? modelUsed.form[form.key] : {};
        modelUsed.form[form.key][form.version] = true;
      }
    });

    return Promise.resolve(modelUsed);
  });
}

/**
 * Fetch metadata from database
 *
 * @param {boolean} includeAllReferred when user query with includeAllReferred, return result with all used version of
 *
 * @return {object} metadata from database
 */
function loadMetadataFromDb(includeAllReferred) {
  const query = {
    attributes: { exclude: ['deletedAt', 'deletedBy'] },
    raw: true,
  };
  const projectProductTemplateQuery = {
    where: {
      deletedAt: { $eq: null },
      disabled: false,
    },
    attributes: { exclude: ['deletedAt', 'deletedBy'] },
    raw: true,
  };
  // when user query with includeAllReferred, return result with all used version of
  // Form, PriceConfig, PlanConfig
  if (includeAllReferred) {
    let usedModelMap;
    let latestVersion;
    return getUsedModel()
      .then((modelUsed) => {
        // found all latest version & used in project template version record
        // for Form, PriceConfig, PlanConfig
        usedModelMap = modelUsed;
        return Promise.all([
          models.Form.latestVersionIncludeUsed(usedModelMap.form),
          models.PriceConfig.latestVersionIncludeUsed(usedModelMap.priceConfig),
          models.PlanConfig.latestVersionIncludeUsed(usedModelMap.planConfig),
        ]);
      }).then((latestVersionModels) => {
        latestVersion = latestVersionModels;
        return Promise.all([
          models.ProjectTemplate.findAll(projectProductTemplateQuery),
          models.ProductTemplate.findAll(projectProductTemplateQuery),
          models.MilestoneTemplate.findAll(query),
          models.ProjectType.findAll(query),
          models.ProductCategory.findAll(query),
          Promise.resolve(latestVersion[0]),
          Promise.resolve(latestVersion[1]),
          Promise.resolve(latestVersion[2]),
        ]);
      }).then(queryAllResult => ({
        projectTemplates: queryAllResult[0],
        productTemplates: queryAllResult[1],
        milestoneTemplates: queryAllResult[2],
        projectTypes: queryAllResult[3],
        productCategories: queryAllResult[4],
        forms: queryAllResult[5],
        priceConfigs: queryAllResult[6],
        planConfigs: queryAllResult[7],
      }),
      );
  }
  return Promise.all([
    models.ProjectTemplate.findAll(projectProductTemplateQuery),
    models.ProductTemplate.findAll(projectProductTemplateQuery),
    models.MilestoneTemplate.findAll(query),
    models.ProjectType.findAll(query),
    models.ProductCategory.findAll(query),
    models.Form.latestVersion(),
    models.PriceConfig.latestVersion(),
    models.PlanConfig.latestVersion(),
    models.BuildingBlock.findAll(query),
  ]).then(results => ({
    projectTemplates: results[0],
    productTemplates: results[1],
    milestoneTemplates: results[2],
    projectTypes: results[3],
    productCategories: results[4],
    forms: results[5],
    priceConfigs: results[6],
    planConfigs: results[7],
    buildingBlocks: results[8],
  }));
}

module.exports = [
  validate(schema),
  permissions('metadata.list'),
  (req, res, next) => {
    // As we are generally return all the data from metadata ES index we just get all the index data
    // instead of creating a detailed request to get each type of object
    // There are few reasons for this:
    // + getting all the index works much faster than making detailed request:
    //   ~2.5 seconds using detailed query vs 0.15 seconds without query (including JS filtering)
    // + making request we have to get data from `inner_hits` and specify `size` which is by default is `3`
    //   otherwise we wouldn't get all the data, but we want to get all the data
    // Disadvantage:
    // - we have to filter disabled Project Templates and Product Templates by JS
    util.fetchFromES(null, null, 'metadata')
      .then((data) => {
        const esDataToReturn = _.pick(data, metadataProperties);
        // if some metadata properties are not returned from ES, then initialize such properties with empty array
        // for consistency
        metadataProperties.forEach((prop) => {
          if (!esDataToReturn[prop]) {
            esDataToReturn[prop] = [];
          }
        });

        // return only non-disabled Project Templates
        if (esDataToReturn.projectTemplates && esDataToReturn.projectTemplates.length > 0) {
          esDataToReturn.projectTemplates = _.filter(esDataToReturn.projectTemplates, { disabled: false });
        }

        // return only non-disabled Product Templates
        if (esDataToReturn.productTemplates && esDataToReturn.productTemplates.length > 0) {
          esDataToReturn.productTemplates = _.filter(esDataToReturn.productTemplates, { disabled: false });
        }

        // WARNING: `BuildingBlock` model contains sensitive data!
        //
        // We should NEVER return `privateConfig` property for `buildingBlocks`.
        // For the DB we use hooks to always clear it out, see `src/models/buildingBlock.js`.
        // For the ES so far we should always remember about it and filter it out.
        if (esDataToReturn.buildingBlocks && esDataToReturn.buildingBlocks.length > 0) {
          esDataToReturn.buildingBlocks = _.map(
            esDataToReturn.buildingBlocks,
            buildingBlock => _.omit(buildingBlock, 'privateConfig'),
          );
        }

        // check if any data is returned from ES
        const hasDataInES = _.some(esDataToReturn, propData => propData && propData.length > 0);

        if (hasDataInES) {
          req.log.debug('Metadata is found in ES');
          return res.json(esDataToReturn);
        }

        req.log.debug('Metadata is not found in ES');
        return loadMetadataFromDb(req.query.includeAllReferred).then(dbDataToReturn => res.json(dbDataToReturn));
      })
      .catch(next);
  },
];
