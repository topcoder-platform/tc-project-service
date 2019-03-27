/**
 * API to add a project template
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
  body: {
    param: Joi.object().keys({
      id: Joi.any().strip(),
      name: Joi.string().max(255).required(),
      key: Joi.string().max(45).required(),
      category: Joi.string().max(45).required(),
      icon: Joi.string().max(255).required(),
      question: Joi.string().max(255).required(),
      info: Joi.string().max(255).required(),
      aliases: Joi.array().required(),
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
  permissions('projectTemplate.create'),
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
        const entity = _.assign(req.body.param, {
          createdBy: req.authUser.userId,
          updatedBy: req.authUser.userId,
        });

        return models.ProjectTemplate.create(entity)
          .then((createdEntity) => {
            // Omit deletedAt, deletedBy
            res.status(201).json(util.wrapResponse(
              req.id, _.omit(createdEntity.toJSON(), 'deletedAt', 'deletedBy'), 1, 201));
          });
      }).catch(next);
  },
];
