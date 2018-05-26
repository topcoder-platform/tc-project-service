/**
 * API to update a project template
 */
import validate from 'express-validation';
import _ from 'lodash';
import Joi from 'joi';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import util from '../../util';
import models from '../../models';

const permissions = tcMiddleware.permissions;

const schema = {
  params: {
    templateId: Joi.number().integer().positive().required(),
  },
  body: {
    param: Joi.object().keys({
      id: Joi.any().strip(),
      name: Joi.string().max(255).required(),
      key: Joi.string().max(45).required(),
      category: Joi.string().max(45).required(),
      scope: Joi.object().required(),
      phases: Joi.object().required(),
      createdAt: Joi.any().strip(),
      updatedAt: Joi.any().strip(),
      deletedAt: Joi.any().strip(),
      createdBy: Joi.any().strip(),
      updatedBy: Joi.any().strip(),
      deletedBy: Joi.any().strip(),
    }).required(),
  },
};

module.exports = [
  validate(schema),
  permissions('projectTemplate.edit'),
  (req, res, next) => {
    const entityToUpdate = _.assign(req.body.param, {
      updatedBy: req.authUser.userId,
    });

    return models.ProjectTemplate.findOne({
      where: {
        deletedAt: { $eq: null },
        id: req.params.templateId,
      },
      attributes: { exclude: ['deletedAt', 'deletedBy'] },
    })
      .then((projectTemplate) => {
        // Not found
        if (!projectTemplate) {
          const apiErr = new Error(`Project template not found for template id ${req.params.templateId}`);
          apiErr.status = 404;
          return Promise.reject(apiErr);
        }

        // Merge JSON fields
        entityToUpdate.scope = util.mergeJsonObjects(projectTemplate.scope, entityToUpdate.scope);
        entityToUpdate.phases = util.mergeJsonObjects(projectTemplate.phases, entityToUpdate.phases);

        return projectTemplate.update(entityToUpdate);
      })
      .then((projectTemplate) => {
        res.json(util.wrapResponse(req.id, projectTemplate));
        return Promise.resolve();
      })
      .catch(next);
  },
];
