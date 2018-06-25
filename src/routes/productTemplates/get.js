/**
 * API to get a product template
 */
import validate from 'express-validation';
import Joi from 'joi';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import util from '../../util';
import models from '../../models';

const permissions = tcMiddleware.permissions;

const schema = {
  params: {
    templateId: Joi.number().integer().positive().required(),
  },
};

module.exports = [
  validate(schema),
  permissions('productTemplate.view'),
  (req, res, next) => models.ProductTemplate.findOne({
    where: {
      deletedAt: { $eq: null },
      id: req.params.templateId,
    },
    attributes: { exclude: ['deletedAt', 'deletedBy'] },
    raw: true,
  })
    .then((productTemplate) => {
      // Not found
      if (!productTemplate) {
        const apiErr = new Error(`Product template not found for product id ${req.params.templateId}`);
        apiErr.status = 404;
        return Promise.reject(apiErr);
      }

      res.json(util.wrapResponse(req.id, productTemplate));
      return Promise.resolve();
    })
    .catch(next),
];
