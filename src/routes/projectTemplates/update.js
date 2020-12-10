/**
 * API to update a project template
 */
import validate from 'express-validation';
import _ from 'lodash';
import Joi from 'joi';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import { EVENT, RESOURCES } from '../../constants';
import fieldLookupValidation from '../../middlewares/fieldLookupValidation';
import util from '../../util';
import models from '../../models';

const permissions = tcMiddleware.permissions;

const schema = {
  params: {
    templateId: Joi.number().integer().positive().required(),
  },
  body: Joi.object().keys({
    id: Joi.any().strip(),
    name: Joi.string().max(255),
    key: Joi.string().max(45),
    category: Joi.string().max(45),
    subCategory: Joi.string().max(45).empty(null),
    metadata: Joi.object(),
    icon: Joi.string().max(255),
    question: Joi.string().max(255),
    info: Joi.string().max(1024),
    aliases: Joi.array(),
    scope: Joi.object().empty(null),
    phases: Joi.object().empty(null),
    form: Joi.object().keys({
      key: Joi.string().required(),
      version: Joi.number(),
    }).empty(null),
    planConfig: Joi.object().keys({
      key: Joi.string().required(),
      version: Joi.number(),
    }).empty(null),
    priceConfig: Joi.object().keys({
      key: Joi.string().required(),
      version: Joi.number(),
    }).empty(null),
    disabled: Joi.boolean().optional(),
    hidden: Joi.boolean().optional(),
    createdAt: Joi.any().strip(),
    updatedAt: Joi.any().strip(),
    deletedAt: Joi.any().strip(),
    createdBy: Joi.any().strip(),
    updatedBy: Joi.any().strip(),
    deletedBy: Joi.any().strip(),
  })
    .xor('form', 'scope')
    .xor('phases', 'planConfig')
    .nand('priceConfig', 'scope')
    .required(),
};

module.exports = [
  validate(schema),
  permissions('projectTemplate.edit'),
  fieldLookupValidation(models.ProjectType, 'key', 'body.category', 'Category'),
  (req, res, next) => {
    const param = req.body;
    const { form, priceConfig, planConfig } = param;

    return Promise.all([
      util.checkModel(form, 'Form', models.Form, 'project template'),
      util.checkModel(priceConfig, 'PriceConfig', models.PriceConfig, 'project template'),
      util.checkModel(planConfig, 'PlanConfig', models.PlanConfig, 'project template'),
    ])
      .then(() => {
        const entityToUpdate = _.assign(req.body, {
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
              throw apiErr;
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
            util.sendResourceToKafkaBus(
              req,
              EVENT.ROUTING_KEY.PROJECT_METADATA_UPDATE,
              RESOURCES.PROJECT_TEMPLATE,
              projectTemplate.get({ plain: true }),
            );

            res.json(projectTemplate);
          });
      }).catch(next);
  },
];
