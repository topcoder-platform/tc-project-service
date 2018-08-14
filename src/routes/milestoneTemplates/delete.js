/**
 * API to delete a milestone template
 */
import validate from 'express-validation';
import Joi from 'joi';
import { middleware as tcMiddleware } from 'tc-core-library-js';
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
  permissions('milestoneTemplate.delete'),
  (req, res, next) => {
    const where = {
      id: req.params.milestoneTemplateId,
      deletedAt: { $eq: null },
      productTemplateId: req.params.productTemplateId,
    };

    return models.sequelize.transaction(() =>
      // soft delete the record
      models.ProductMilestoneTemplate.findOne({
        where,
      }).then((existing) => {
        if (!existing) {
          // handle 404
          const err = new Error(
            `Milestone template not found for milestone template id ${req.params.milestoneTemplateId}`);
          err.status = 404;
          return Promise.reject(err);
        }
        return existing.update({ deletedBy: req.authUser.userId });
      })
        .then(entity => entity.destroy()))
        .then(() => {
          res.status(204).end();
        })
        .catch(next);
  },
];
