/**
 * API to get project permissions
 */
import validate from 'express-validation';
import Joi from 'joi';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import util from '../../util';
import models from '../../models';

const permissions = tcMiddleware.permissions;

const schema = {
  params: {
    projectId: Joi.number().integer().positive().required(),
  },
};

module.exports = [
  validate(schema),
  permissions('permissions.view'),
  (req, res, next) => {
    const projectId = req.params.projectId;
    return models.Project.findOne({
      where: {
        id: projectId,
      },
    })
      .then((project) => {
        if (!project) {
          const apiErr = new Error(`Project not found for id ${projectId}`);
          apiErr.status = 404;
          return Promise.reject(apiErr);
        }

        if (!project.templateId) {
          return Promise.resolve([]);
        }

        return models.WorkManagementPermission.findAll({
          where: {
            projectTemplateId: project.templateId,
          },
        });
      })
      .then((workManagementPermissions) => {
        const allowPermissions = {};

        // find all allowed permissions
        workManagementPermissions.forEach((workManagementPermission) => {
          const isAllowed = util.hasPermissionByReq(workManagementPermission.permission, req);

          if (isAllowed) {
            allowPermissions[workManagementPermission.policy] = true;
          }
        });

        res.json(allowPermissions);
      })
      .catch(next);
  },
];
