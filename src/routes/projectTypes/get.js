/**
 * API to get a project type
 */
import validate from 'express-validation';
import Joi from 'joi';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import models from '../../models';

const permissions = tcMiddleware.permissions;

const schema = {
  params: {
    key: Joi.string().max(45).required(),
  },
};

module.exports = [
  validate(schema),
  permissions('projectType.view'),
  (req, res, next) =>
    models.ProjectType.findOne({
      where: {
        key: req.params.key,
      },
      attributes: { exclude: ['deletedAt', 'deletedBy'] },
      raw: true,
    })
      .then((projectType) => {
        if (!projectType) {
          const apiErr = new Error(`Project type not found for key ${req.params.key}`);
          apiErr.status = 404;
          return Promise.reject(apiErr);
        }

        res.json(projectType);
        return Promise.resolve();
      })
      .catch(next),
];
