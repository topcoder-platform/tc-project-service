/**
 * API to clone a milestone template
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
    productTemplateId: Joi.number().integer().positive().required(),
  },
  body: {
    param: Joi.object().keys({
      sourceTemplateId: Joi.number().integer().positive().required(),
    }).required(),
  },
};

module.exports = [
  validate(schema),
  permissions('milestoneTemplate.clone'),
  (req, res, next) => {
    let result;

    return models.sequelize.transaction(tx =>
      // Find the product template
      models.ProductTemplate.findAll({ where: { id: [req.params.productTemplateId, req.body.param.sourceTemplateId] },
        transaction: tx })
        .then((productTemplates) => {
          // Not found
          if (!productTemplates) {
            const apiErr = new Error(
              `Product template not found for product template ids ${req.params.productTemplateId}
              ${req.body.param.sourceTemplateId}`);
            apiErr.status = 404;
            return Promise.reject(apiErr);
          }

          const targetProductTemplate = _.find(productTemplates, ['id', req.params.productTemplateId]);
          const sourceProductTemplate = _.find(productTemplates, ['id', req.body.param.sourceTemplateId]);

          // Not found
          if (!targetProductTemplate) {
            const apiErr = new Error(
              `Product template not found for product template id ${req.params.productTemplateId}`);
            apiErr.status = 404;
            return Promise.reject(apiErr);
          }

          // Not found
          if (!sourceProductTemplate) {
            const apiErr = new Error(
              `Product template not found for source product template id ${req.body.param.sourceTemplateId}`);
            apiErr.status = 404;
            return Promise.reject(apiErr);
          }

          return models.ProductMilestoneTemplate.findAll({
            where: {
              productTemplateId: req.body.param.sourceTemplateId,
            },
            attributes: { exclude: ['id', 'deletedAt', 'createdAt', 'updatedAt', 'deletedBy'] },
            raw: true,
          })
          .then((milestoneTemplatesToClone) => {
            const newMilestoneTemplates = _.cloneDeep(milestoneTemplatesToClone);
            _.each(newMilestoneTemplates, (milestone) => {
              milestone.productTemplateId = req.params.productTemplateId; // eslint-disable-line no-param-reassign
              milestone.createdBy = req.authUser.userId; // eslint-disable-line no-param-reassign
              milestone.updatedBy = req.authUser.userId; // eslint-disable-line no-param-reassign
            });
            return models.ProductMilestoneTemplate.bulkCreate(newMilestoneTemplates, { transaction: tx });
          });
        })
        .then(() => { // eslint-disable-line arrow-body-style
          return models.ProductMilestoneTemplate.findAll({
            where: {
              productTemplateId: req.params.productTemplateId,
            },
            attributes: { exclude: ['deletedAt', 'deletedBy'] },
            raw: true,
          })
          .then((clonedMilestoneTemplates) => {
            result = clonedMilestoneTemplates;
            return result;
          });
        }),
    )
    .then(() => {
      // Write to response
      res.status(201).json(util.wrapResponse(req.id, result, 1, 201));
    })
    .catch(next);
  },
];
