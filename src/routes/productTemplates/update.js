/**
 * API to update a product template
 */
import validate from 'express-validation';
import _ from 'lodash';
import Joi from 'joi';
import { middleware as tcMiddleware } from 'tc-core-library-js';
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
      name: Joi.string().max(255).required(),
      productKey: Joi.string().max(45).required(),
      icon: Joi.string().max(255).required(),
      brief: Joi.string().max(45).required(),
      details: Joi.string().max(255).required(),
      aliases: Joi.object().required(),
      template: Joi.object().required(),
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
  permissions('productTemplate.edit'),
  (req, res, next) => {
    const entityToUpdate = _.assign(req.body.param, {
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

        // Merge JSON fields
        entityToUpdate.aliases = util.mergeJsonObjects(productTemplate.aliases, entityToUpdate.aliases);
        entityToUpdate.template = util.mergeJsonObjects(productTemplate.template, entityToUpdate.template);

        return productTemplate.update(entityToUpdate);
      })
      .then((productTemplate) => {
        res.json(util.wrapResponse(req.id, productTemplate));
        return Promise.resolve();
      })
      .catch(next);
  },
];
