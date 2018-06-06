/**
 * API to get a milestone template
 */
import validate from 'express-validation';
import Joi from 'joi';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import util from '../../util';
import models from '../../models';

const permissions = tcMiddleware.permissions;

const schema = {
  params: {
    productTemplateId: Joi.number().integer().positive().required(),
    milestoneTemplateId: Joi.number().integer().positive().required(),
  },
};

module.exports = [
  validate(schema),
  permissions('milestoneTemplate.view'),
  (req, res, next) => models.ProductMilestoneTemplate.findOne({
    where: {
      id: req.params.milestoneTemplateId,
      productTemplateId: req.params.productTemplateId,
    },
    attributes: { exclude: ['deletedAt', 'deletedBy'] },
    raw: true,
  })
    .then((milestoneTemplate) => {
      // Not found
      if (!milestoneTemplate) {
        const apiErr = new Error(
          `Milestone template not found for milestone template id ${req.params.milestoneTemplateId}`);
        apiErr.status = 404;
        return Promise.reject(apiErr);
      }

      res.json(util.wrapResponse(req.id, milestoneTemplate));
      return Promise.resolve();
    })
    .catch(next),
];
