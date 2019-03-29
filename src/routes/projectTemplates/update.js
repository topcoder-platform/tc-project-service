/**
 * API to update a project template
 */
import validate from 'express-validation';
import _ from 'lodash';
import Joi from 'joi';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import fieldLookupValidation from '../../middlewares/fieldLookupValidation';
import util from '../../util';
import models from '../../models';

const permissions = tcMiddleware.permissions;

const schema = {
  params: {
    templateId: Joi.number().integer().positive().required(),
  },
  body: {
    param: Joi.object().keys({
      id: Joi.any().strip(),
      name: Joi.string().max(255),
      key: Joi.string().max(45),
      category: Joi.string().max(45),
      icon: Joi.string().max(255),
      question: Joi.string().max(255),
      info: Joi.string().max(255),
      aliases: Joi.array(),
      scope: Joi.object().optional().allow(null),
      phases: Joi.object().optional().allow(null),
      form: Joi.object().optional().allow(null),
      planConfig: Joi.object().optional().allow(null),
      priceConfig: Joi.object().optional().allow(null),
      disabled: Joi.boolean().optional(),
      hidden: Joi.boolean().optional(),
      createdAt: Joi.any().strip(),
      updatedAt: Joi.any().strip(),
      deletedAt: Joi.any().strip(),
      createdBy: Joi.any().strip(),
      updatedBy: Joi.any().strip(),
      deletedBy: Joi.any().strip(),
    }).required(),
  },
};

module.exports = [
  validate(schema),
  permissions('projectTemplate.edit'),
  fieldLookupValidation(models.ProjectType, 'key', 'body.param.category', 'Category'),
  (req, res, next) => {
    const param = req.body.param;
    const { form, priceConfig, planConfig } = param;

    const checkModel = (keyInfo, modelName, model) => {
      let errorMessage = '';
      if (keyInfo == null) {
        return Promise.resolve(null);
      }
      if ((keyInfo.version != null) && (keyInfo.key != null)) {
        errorMessage = `${modelName} with key ${keyInfo.key} and version ${keyInfo.version}`
          + ' referred in the project template is not found';
        return (model.findOne({
          where: {
            key: keyInfo.key,
            version: keyInfo.version,
          },
        })).then((record) => {
          if (record == null) {
            return Promise.resolve(errorMessage);
          }
          return Promise.resolve(null);
        });
      } else if ((keyInfo.version == null) && (keyInfo.key != null)) {
        errorMessage = `${modelName} with key ${keyInfo.key}`
          + ' referred in the project template is not found';
        return model.findOne({
          where: {
            key: keyInfo.key,
          },
        }).then((record) => {
          if (record == null) {
            return Promise.resolve(errorMessage);
          }
          return Promise.resolve(null);
        });
      }
      return Promise.resolve(null);
    };

    return Promise.all([
      checkModel(form, 'Form', models.Form, next),
      checkModel(priceConfig, 'PriceConfig', models.PriceConfig, next),
      checkModel(planConfig, 'PlanConfig', models.PlanConfig, next),
    ])
        .then((errorMessages) => {
          const errorMessage = errorMessages.find(e => e && e.length > 0);
          if (errorMessage) {
            const apiErr = new Error(errorMessage);
            apiErr.status = 422;
            throw apiErr;
          }
          const entityToUpdate = _.assign(req.body.param, {
            updatedBy: req.authUser.userId,
          });

          return models.ProjectTemplate.findOne({
            where: {
              deletedAt: { $eq: null },
              id: req.params.templateId,
            },
            attributes: { exclude: ['deletedAt', 'deletedBy'] },

          })
          .then((projectTemplate) => {
            // Not found
            if (!projectTemplate) {
              const apiErr = new Error(`Project template not found for template id ${req.params.templateId}`);
              apiErr.status = 404;
              return Promise.reject(apiErr);
            }

            // Merge JSON fields
            entityToUpdate.scope = util.mergeJsonObjects(
              projectTemplate.scope,
              entityToUpdate.scope,
              ['priceConfig', 'addonPriceConfig', 'preparedConditions', 'buildingBlocks'],
            );
            entityToUpdate.phases = util.mergeJsonObjects(projectTemplate.phases, entityToUpdate.phases);
            // removes null phase templates
            entityToUpdate.phases = _.omitBy(entityToUpdate.phases, _.isNull);

            return projectTemplate.update(entityToUpdate);
          })
          .then((projectTemplate) => {
            res.json(util.wrapResponse(req.id, projectTemplate));
            return Promise.resolve();
          })
          .catch(next);
        }).catch(next);
  },
];
