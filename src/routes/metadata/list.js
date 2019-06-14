 /**
 * API to list all metadata
 */
import { middleware as tcMiddleware } from 'tc-core-library-js';
import Joi from 'joi';
import validate from 'express-validation';
import models from '../../models';

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


module.exports = [
  validate(schema),
  permissions('metadata.list'),
  (req, res, next) => {
    const query = {
      attributes: { exclude: ['deletedAt', 'deletedBy'] },
      raw: true,
    };

    // when user query with includeAllReferred, return result with all used version of
    // Form, PriceConfig, PlanConfig
    if (req.query.includeAllReferred) {
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
            models.ProjectTemplate.findAll(query),
            models.ProductTemplate.findAll(query),
            models.MilestoneTemplate.findAll(query),
            models.ProjectType.findAll(query),
            models.ProductCategory.findAll(query),
            Promise.resolve(latestVersion[0]),
            Promise.resolve(latestVersion[1]),
            Promise.resolve(latestVersion[2]),
          ]);
        }).then((queryAllResult) => {
          res.json({
            projectTemplates: queryAllResult[0],
            productTemplates: queryAllResult[1],
            milestoneTemplates: queryAllResult[2],
            projectTypes: queryAllResult[3],
            productCategories: queryAllResult[4],
            forms: queryAllResult[5],
            priceConfigs: queryAllResult[6],
            planConfigs: queryAllResult[7],
          });
        })
        .catch(next);
    }
    return Promise.all([
      models.ProjectTemplate.findAll(query),
      models.ProductTemplate.findAll(query),
      models.MilestoneTemplate.findAll(query),
      models.ProjectType.findAll(query),
      models.ProductCategory.findAll(query),
      models.Form.latestVersion(),
      models.PriceConfig.latestVersion(),
      models.PlanConfig.latestVersion(),
    ])
      .then((results) => {
        res.json({
          projectTemplates: results[0],
          productTemplates: results[1],
          milestoneTemplates: results[2],
          projectTypes: results[3],
          productCategories: results[4],
          forms: results[5],
          priceConfigs: results[6],
          planConfigs: results[7],
        });
      })
      .catch(next);
  },
];
