/**
 * API to delete a product template
 */
import validate from 'express-validation';
import Joi from 'joi';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import models from '../../models';

const permissions = tcMiddleware.permissions;

const schema = {
  params: {
    templateId: Joi.number().integer().positive().required(),
  },
};

module.exports = [
  validate(schema),
  permissions('productTemplate.delete'),
  (req, res, next) =>
     models.sequelize.transaction(() =>
      models.ProductTemplate.findById(req.params.templateId)
        .then((entity) => {
          if (!entity) {
            const apiErr = new Error(`Product template not found for template id ${req.params.templateId}`);
            apiErr.status = 404;
            return Promise.reject(apiErr);
          }
          // Update the deletedBy, then delete
          return entity.update({ deletedBy: req.authUser.userId });
        })
        .then(entity => entity.destroy()))
        .then(() => {
          res.status(204).end();
        })
        .catch(next),
];
