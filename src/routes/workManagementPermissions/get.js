/**
 * API to get a work management permission
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
  permissions('workManagementPermission.view'),
  (req, res, next) => models.WorkManagementPermission.findOne({
    where: {
      id: req.params.id,
    },
    attributes: { exclude: ['deletedAt', 'deletedBy'] },
  })
    .then((existing) => {
      // Not found
      if (!existing) {
        const apiErr = new Error(`Work Management Permission not found for id ${req.params.id}`);
        apiErr.status = 404;
        return Promise.reject(apiErr);
      }

      res.json(existing);
      return Promise.resolve();
    })
    .catch(next),
];
