/**
 * API to delete a project type
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
  permissions('projectType.delete'),
  (req, res, next) =>
     models.sequelize.transaction(() =>
      models.ProjectType.findById(req.params.key)
        .then((entity) => {
          if (!entity) {
            const apiErr = new Error(`Project type not found for key ${req.params.key}`);
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
