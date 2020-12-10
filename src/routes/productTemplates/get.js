/**
 * API to get a product template
 */
import validate from 'express-validation';
import Joi from 'joi';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import models from '../../models';
import util from '../../util';

const permissions = tcMiddleware.permissions;

const schema = {
  params: {
    templateId: Joi.number().integer().positive().required(),
  },
};

module.exports = [
  validate(schema),
  permissions('productTemplate.view'),
  (req, res, next) => {
    util.fetchByIdFromES('productTemplates', {
      query: {
        nested: {
          path: 'productTemplates',
          query: {
            match: { 'productTemplates.id': req.params.templateId },
          },
          inner_hits: {},
        },
      },
    }, 'metadata')
      .then((data) => {
        if (data.length === 0) {
          req.log.debug('No productTemplate found in ES');
          models.ProductTemplate.findOne({
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

              res.json(productTemplate);
              return Promise.resolve();
            })
            .catch(next);
        } else {
          req.log.debug('productTemplates found in ES');
          res.json(data[0].inner_hits.productTemplates.hits.hits[0]._source); // eslint-disable-line no-underscore-dangle
        }
      })
      .catch(next);
  },
];
