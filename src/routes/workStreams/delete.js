/**
 * API to delete a work stream
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
  permissions('workStream.delete'),
  (req, res, next) =>
    models.sequelize.transaction(() =>
      models.WorkStream.findOne({
        where: {
          id: req.params.id,
          projectId: req.params.projectId,
        },
      })
        .then((entity) => {
          if (!entity) {
            const apiErr = new Error(`Work Stream not found for id ${req.params.id} ` +
              `and project id ${req.params.projectId}`);
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
