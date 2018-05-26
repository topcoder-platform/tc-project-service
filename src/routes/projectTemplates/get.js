/**
 * API to get a project template
 */
import validate from 'express-validation';
import Joi from 'joi';
import { middleware as tcMiddleware } from 'tc-core-library-js';
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
  permissions('projectTemplate.view'),
  (req, res, next) => models.ProjectTemplate.findOne({
    where: {
      deletedAt: { $eq: null },
      id: req.params.templateId,
    },
    attributes: { exclude: ['deletedAt', 'deletedBy'] },
    raw: true,
  })
    .then((projectTemplate) => {
      // Not found
      if (!projectTemplate) {
        const apiErr = new Error(`Project template not found for project id ${req.params.templateId}`);
        apiErr.status = 404;
        return Promise.reject(apiErr);
      }

      res.json(util.wrapResponse(req.id, projectTemplate));
      return Promise.resolve();
    })
    .catch(next),
];
