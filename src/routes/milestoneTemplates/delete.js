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

    return models.sequelize.transaction(tx =>
      // Update the deletedBy
      models.ProductMilestoneTemplate.update({ deletedBy: req.authUser.userId }, {
        where,
        returning: true,
        raw: true,
        transaction: tx,
      })
        .then((updatedResults) => {
          // Not found
          if (updatedResults[0] === 0) {
            const apiErr = new Error(
              `Milestone template not found for milestone template id ${req.params.milestoneTemplateId}`);
            apiErr.status = 404;
            return Promise.reject(apiErr);
          }

          // Soft delete
          return models.ProductMilestoneTemplate.destroy({
            where,
            transaction: tx,
          });
        })
        .then(() => {
          res.status(204).end();
        })
        .catch(next),
    );
  },
];
