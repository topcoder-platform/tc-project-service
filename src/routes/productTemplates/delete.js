/**
 * API to delete a product template
 */
import validate from 'express-validation';
import _ from 'lodash';
import Joi from 'joi';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import { EVENT, RESOURCES } from '../../constants';
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
  permissions('productTemplate.delete'),
  (req, res, next) =>
    models.sequelize.transaction(() =>
      models.ProductTemplate.findByPk(req.params.templateId)
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
      .then((entity) => {
        // emit event
        util.sendResourceToKafkaBus(req,
          EVENT.ROUTING_KEY.PROJECT_METADATA_DELETE,
          RESOURCES.PRODUCT_TEMPLATE,
          _.pick(entity.toJSON(), 'id'));
        res.status(204).end();
      })
      .catch(next),
];
