/**
 * API to add a new version of form
 */
import validate from 'express-validation';
import _ from 'lodash';
import Joi from 'joi';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import util from '../../util';
import models from '../../models';

const permissions = tcMiddleware.permissions;


const schema = {
  body: {
    param: Joi.object().keys({
      form: Joi.object().keys({
        version: Joi.number().integer().positive().required(),
        key: Joi.string().required(),
      }).optional(),
      priceConfig: Joi.object().keys({
        version: Joi.number().integer().positive().required(),
        key: Joi.string().required(),
      }).optional(),
      planConfig: Joi.object().keys({
        version: Joi.number().integer().positive().required(),
        key: Joi.string().required(),
      }).optional(),
    }).optional(),
  },
};


module.exports = [
  permissions('projectTemplate.upgrade'),
  validate(schema),
  (req, res, next) => {
    models.sequelize.transaction(() => models.ProjectTemplate.findOne({
      where: {
        id: req.params.templateId,
      },
    // eslint-disable-next-line consistent-return
    }).then(async (pt) => {
      if (pt == null) {
        const apiErr = new Error(`project template not found for id ${req.body.param.templateId}`);
        apiErr.status = 404;
        return Promise.reject(apiErr);
      }
      if ((pt.scope == null) || (pt.phases == null)) {
        const apiErr = new Error('Current project template\'s scope or phases is null');
        apiErr.status = 422;
        return Promise.reject(apiErr);
      }

      const checkModel = (keyInfo, modelName, model) => {
        let errorMessage = '';
        errorMessage = `${modelName} with key ${keyInfo.key} and version ${keyInfo.version}`
          + ' referred in param is not found';
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
      };

      const reportError = (errorMessage) => {
        const apiErr = new Error(errorMessage);
        apiErr.status = 422;
        return Promise.reject(apiErr).catch(next);
      };

      // get form field
      let newForm = {};
      if (req.body.param.form == null) {
        const scope = {
          sections: pt.scope ? pt.scope.sections : null,
          wizard: pt.scope ? pt.scope.wizard : null,
          preparedConditions: pt.scope ? pt.scope.preparedConditions : null,
        };
        const form = await models.Form.createNewVersion(pt.key, scope, req.authUser.userId);
        newForm = {
          version: form.version,
          key: pt.key,
        };
      } else {
        newForm = req.body.param.form;
        const err = await checkModel(newForm, 'Form', models.Form);
        if (err != null) {
          reportError(err);
        }
      }
      // get price config field
      let newPriceConfig = {};
      if (req.body.param.priceConfig == null) {
        const config = {};
        if (pt.scope) {
          Object.keys(pt.scope).filter(key => (key !== 'wizard') && (key !== 'sections')).forEach((key) => {
            config[key] = pt.scope[key];
          });
        }
        const priceConfig = await models.PriceConfig.createNewVersion(pt.key, config, req.authUser.userId);
        newPriceConfig = {
          version: priceConfig.version,
          key: pt.key,
        };
      } else {
        newPriceConfig = req.body.param.priceConfig;
        const err = await checkModel(newPriceConfig, 'PriceConfig', models.PriceConfig);
        if (err != null) {
          reportError(err);
        }
      }
      // get plan config field
      let newPlanConfig = {};
      if (req.body.param.planConfig == null) {
        const planConfig = await models.PlanConfig.createNewVersion(pt.key, pt.phases, req.authUser.userId);
        newPlanConfig = {
          version: planConfig.version,
          key: pt.key,
        };
      } else {
        newPlanConfig = req.body.param.planConfig;
        const err = await checkModel(newPlanConfig, 'PlanConfig', models.PlanConfig);
        if (err != null) {
          reportError(err);
        }
      }

      const updateInfo = {
        scope: null,
        phases: null,
        form: newForm,
        priceConfig: newPriceConfig,
        planConfig: newPlanConfig,
        updatedBy: req.authUser.userId,
      };

      const newPt = await pt.update(updateInfo);

      res.status(201).json(util.wrapResponse(
        req.id, _.omit(newPt.toJSON(), 'deletedAt', 'deletedBy'), 1, 201));
    })
    .catch(next));
  },
];
