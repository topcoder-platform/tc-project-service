/**
 * API to add a product template
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
      category: Joi.string().max(45).required(),
      subCategory: Joi.string().max(45).required(),
      name: Joi.string().max(255).required(),
      productKey: Joi.string().max(45).required(),
      icon: Joi.string().max(255).required(),
      brief: Joi.string().max(45).required(),
      details: Joi.string().max(255).required(),
      aliases: Joi.array().required(),
      template: Joi.object(),
      form: Joi.object(),
      disabled: Joi.boolean().optional(),
      hidden: Joi.boolean().optional(),
      isAddOn: Joi.boolean().optional(),
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
  permissions('productTemplate.create'),
  fieldLookupValidation(models.ProductCategory, 'key', 'body.param.category', 'Category'),
  (req, res, next) => {
    const param = req.body.param;
    const { form } = param;
    return util.checkModel(form, 'Form', models.Form, 'product template')
      .then(() => {
        const entity = _.assign(param, {
          createdBy: req.authUser.userId,
          updatedBy: req.authUser.userId,
        });

        return models.ProductTemplate.create(entity)
          .then((createdEntity) => {
            // Omit deletedAt, deletedBy
            res.status(201).json(util.wrapResponse(
              req.id, _.omit(createdEntity.toJSON(), 'deletedAt', 'deletedBy'), 1, 201));
          })
          .catch(next);
      })
      .catch(next);
  },
];
