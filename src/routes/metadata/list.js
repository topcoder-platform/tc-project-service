 /**
 * API to list all metadata
 */
import { middleware as tcMiddleware } from 'tc-core-library-js';
import Joi from 'joi';
import validate from 'express-validation';

import models from '../../models';
import util from '../../util';

const metadataProperties = ['productTemplates', 'forms', 'projectTemplates', 'planConfigs', 'priceConfigs',
  'projectTypes', 'productCategories', 'milestoneTemplates', 'buildingBlocks'];
const metadataToReturnFromES = 99999;
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
    req.log.debug('try getting metadata from ES.');
    return util.fetchFromES(metadataProperties, {
      query: {
        bool: {
          should: [
            {
              nested: {
                path: 'projectTemplates',
                query: {
                  bool: {
                    must: {
                      match: {
                        'projectTemplates.disabled': false,
                      },
                    },
                    must_not: {
                      match: {
                        'projectTemplates.deleted': true,
                      },
                    },
                  },
                },
                inner_hits: {
                  size: metadataToReturnFromES,
                },
              },
            },
            {
              nested: {
                path: 'productTemplates',
                query: {
                  bool: {
                    must: {
                      match: {
                        'productTemplates.disabled': false,
                      },
                    },
                    must_not: {
                      match: {
                        'productTemplates.deleted': true,
                      },
                    },
                  },
                },
                inner_hits: {
                  size: metadataToReturnFromES,
                },
              },
            },
            {
              nested: {
                path: 'milestoneTemplates',
                query: {
                  match_all: {},
                },
                inner_hits: {
                  size: metadataToReturnFromES,
                },
              },
            },
            {
              nested: {
                path: 'buildingBlocks',
                query: {
                  match_all: {},
                },
                inner_hits: {
                  size: metadataToReturnFromES,
                  _source: {
                    excludes: [
                      'privateConfig',
                    ],
                  },
                },
              },
            },
            {
              nested: {
                path: 'projectTypes',
                query: {
                  match_all: {},
                },
                inner_hits: {
                  size: metadataToReturnFromES,
                },
              },
            },
            {
              nested: {
                path: 'productCategories',
                query: {
                  match_all: {},
                },
                inner_hits: {
                  size: metadataToReturnFromES,
                },
              },
            },
            {
              nested: {
                path: 'forms',
                query: {
                  match_all: {},
                },
                inner_hits: {
                  size: metadataToReturnFromES,
                },
              },
            },
            {
              nested: {
                path: 'priceConfigs',
                query: {
                  match_all: {},
                },
                inner_hits: {
                  size: metadataToReturnFromES,
                },
              },
            },
            {
              nested: {
                path: 'planConfigs',
                query: {
                  match_all: {},
                },
                inner_hits: {
                  size: metadataToReturnFromES,
                },
              },
            },
          ],
        },
      },
    }, 'metadata')
    .then((data) => {
      let esReturnedData = false;
      const resJson = data;
      const numMetadataProperties = metadataProperties.length;
      for (let i = 0; i < numMetadataProperties; i += 1) {
        const property = metadataProperties[i];
        if (resJson[property] != null && !Array.isArray(resJson[property])) {
          resJson[property] = resJson[property].hits.hits.map(hit => hit._source); // eslint-disable-line no-underscore-dangle
          if (resJson[property].length > 0) {
            esReturnedData = true;
          }
        }
      }
      if (esReturnedData) {
        req.log.debug('Returning results from ES');
        return res.json(resJson);
      }
      req.log.debug('ES returned no results');
      return loadMetadataFromDb(req.query.includeAllReferred).then(results => res.json(results));
    })
    .catch(next);
  },
];
