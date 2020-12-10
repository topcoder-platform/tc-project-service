/**
 * API to list all work streams
 */
import validate from 'express-validation';
import Joi from 'joi';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import models from '../../models';

const permissions = tcMiddleware.permissions;

const schema = {
  params: {
    projectId: Joi.number().integer().positive().required(),
  },
};

module.exports = [
  validate(schema),
  permissions('workStream.view'),
  (req, res, next) => {
    const projectId = req.params.projectId;
    models.Project.count({
      where: {
        id: projectId,
      },
    })
      .then((countProject) => {
        if (countProject === 0) {
          const apiErr = new Error(`active project not found for project id ${projectId}`);
          apiErr.status = 404;
          throw apiErr;
        }

        return models.WorkStream.findAll({
          where: {
            projectId,
          },
          attributes: { exclude: ['deletedAt', 'deletedBy'] },
          raw: true,
        });
      })
      .then(workStreams => res.json(workStreams))
      .catch(next);
  },
];
