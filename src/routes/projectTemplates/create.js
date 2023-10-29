/**
 * API to add a project template
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
  body: Joi.object().keys({
    id: Joi.any().strip(),
    name: Joi.string().max(255).required(),
    key: Joi.string().max(45).required(),
    category: Joi.string().max(45).required(),
    subCategory: Joi.string().max(45).empty(null),
    metadata: Joi.object(),
    icon: Joi.string().max(255).required(),
    question: Joi.string().max(255).required(),
    info: Joi.string().max(1024).required(),
    aliases: Joi.array().required(),
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
  permissions('projectTemplate.create'),
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
        const entity = _.assign(req.body, {
          createdBy: req.authUser.userId,
          updatedBy: req.authUser.userId,
        });

        return models.ProjectTemplate.create(entity)
          .then((createdEntity) => {
            // emit event
            util.sendResourceToKafkaBus(
              req,
              EVENT.ROUTING_KEY.PROJECT_METADATA_CREATE,
              RESOURCES.PROJECT_TEMPLATE,
              createdEntity.toJSON(),
            );
            // Omit deletedAt, deletedBy
            res.status(201).json(_.omit(createdEntity.toJSON(), 'deletedAt', 'deletedBy'));
          });
      }).catch(next);
  },
];
