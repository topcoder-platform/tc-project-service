/**
 * API to update a product template
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
    productKey: Joi.string().max(45),
    category: Joi.string().max(45),
    subCategory: Joi.string().max(45),
    icon: Joi.string().max(255),
    brief: Joi.string().max(45),
    details: Joi.string().max(255),
    aliases: Joi.array(),
    template: Joi.object().empty(null),
    form: Joi.object().keys({
      key: Joi.string().required(),
      version: Joi.number(),
    }).empty(null),
    disabled: Joi.boolean().optional(),
    hidden: Joi.boolean().optional(),
    isAddOn: Joi.boolean().optional(),
    createdAt: Joi.any().strip(),
    updatedAt: Joi.any().strip(),
    deletedAt: Joi.any().strip(),
    createdBy: Joi.any().strip(),
    updatedBy: Joi.any().strip(),
    deletedBy: Joi.any().strip(),
  })
    .xor('form', 'template')
    .required(),
};

module.exports = [
  validate(schema),
  permissions('productTemplate.edit'),
  fieldLookupValidation(models.ProductCategory, 'key', 'body.category', 'Category'),
  (req, res, next) => {
    const param = req.body;
    const { form } = param;
    return util.checkModel(form, 'Form', models.Form, 'product template')
      .then(() => {
        const entityToUpdate = _.assign(req.body, {
          updatedBy: req.authUser.userId,
        });

        return models.ProductTemplate.findOne({
          where: {
            deletedAt: { $eq: null },
            id: req.params.templateId,
          },
          attributes: { exclude: ['deletedAt', 'deletedBy'] },
        })
          .then((productTemplate) => {
            // Not found
            if (!productTemplate) {
              const apiErr = new Error(`Product template not found for template id ${req.params.templateId}`);
              apiErr.status = 404;
              return Promise.reject(apiErr);
            }

            if (entityToUpdate.template) {
              // Merge JSON fields
              entityToUpdate.template = util.mergeJsonObjects(productTemplate.template, entityToUpdate.template);
            }

            return productTemplate.update(entityToUpdate);
          })
          .then((productTemplate) => {
            // emit event
            util.sendResourceToKafkaBus(req,
              EVENT.ROUTING_KEY.PROJECT_METADATA_UPDATE,
              RESOURCES.PRODUCT_TEMPLATE,
              productTemplate.get({ plain: true }),
            );
            res.json(productTemplate);
            return Promise.resolve();
          })
          .catch(next);
      })
      .catch(next);
  },
];
