/**
 * API to delete a organization config
 */
import validate from 'express-validation';
import Joi from 'joi';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import models from '../../models';

const permissions = tcMiddleware.permissions;

const schema = {
  params: {
    id: Joi.number().integer().positive().required(),
  },
};

module.exports = [
  validate(schema),
  permissions('orgConfig.delete'),
  (req, res, next) =>
     models.sequelize.transaction(() =>
      models.OrgConfig.findById(req.params.id)
        .then((entity) => {
          if (!entity) {
            const apiErr = new Error(`Organization config not found for id ${req.params.id}`);
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
