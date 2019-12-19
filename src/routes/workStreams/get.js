/**
 * API to get a work stream
 */
import validate from 'express-validation';
import Joi from 'joi';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import models from '../../models';

const permissions = tcMiddleware.permissions;

const schema = {
  params: {
    projectId: Joi.number().integer().positive().required(),
    id: Joi.number().integer().positive().required(),
  },
};

module.exports = [
  validate(schema),
  permissions('workStream.view'),
  (req, res, next) => models.WorkStream.findOne({
    where: {
      id: req.params.id,
      projectId: req.params.projectId,
    },
    attributes: { exclude: ['deletedAt', 'deletedBy'] },
  })
    .then((workStream) => {
      // Not found
      if (!workStream) {
        const apiErr = new Error(`work stream not found for project id ${req.params.projectId} ` +
          `and work stream id ${req.params.id}`);
        apiErr.status = 404;
        return Promise.reject(apiErr);
      }

      res.json(workStream);
      return Promise.resolve();
    })
    .catch(next),
];
