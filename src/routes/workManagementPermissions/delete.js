/**
 * API to delete a work management permission
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
  permissions('workManagementPermission.delete'),
  (req, res, next) =>
    models.sequelize.transaction(() =>
      models.WorkManagementPermission.findByPk(req.params.id)
        .then((entity) => {
          if (!entity) {
            const apiErr = new Error(`Work Management Permission not found for id ${req.params.id}`);
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
