/**
 * API to add a new version of form
 */
import validate from 'express-validation';
import _ from 'lodash';
import Joi from 'joi';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import { EVENT, RESOURCES } from '../../constants';
import util from '../../util';
import models from '../../models';

const permissions = tcMiddleware.permissions;

const schema = {
  body: Joi.object().keys({
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
        const apiErr = new Error(`project template not found for id ${req.body.templateId}`);
        apiErr.status = 404;
        throw apiErr;
      }
      if ((pt.scope == null) || (pt.phases == null)) {
        const apiErr = new Error('Current project template\'s scope or phases is null');
        apiErr.status = 400;
        throw apiErr;
      }

      // get form field
      let newForm = {};
      if (req.body.form == null) {
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
        newForm = req.body.form;
        await util.checkModel(newForm, 'Form', models.Form, 'project template');
      }
      // get price config field
      let newPriceConfig = {};
      if (req.body.priceConfig == null) {
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
        newPriceConfig = req.body.priceConfig;
        await util.checkModel(newPriceConfig, 'PriceConfig', models.PriceConfig, 'project template');
      }
      // get plan config field
      let newPlanConfig = {};
      if (req.body.planConfig == null) {
        const planConfig = await models.PlanConfig.createNewVersion(pt.key, pt.phases, req.authUser.userId);
        newPlanConfig = {
          version: planConfig.version,
          key: pt.key,
        };
      } else {
        newPlanConfig = req.body.planConfig;
        await util.checkModel(newPlanConfig, 'PlanConfig', models.PlanConfig, 'project template');
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

      // emit event
      util.sendResourceToKafkaBus(
        req,
        EVENT.ROUTING_KEY.PROJECT_METADATA_UPDATE,
        RESOURCES.PROJECT_TEMPLATE,
        updateInfo);

      res.status(201).json(_.omit(newPt.toJSON(), 'deletedAt', 'deletedBy'));
    })
      .catch(next));
  },
];
