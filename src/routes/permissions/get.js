/**
 * API to get project permissions
 */
import _ from 'lodash';
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
    let workManagementPermissions;
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
          return Promise.resolve(true);
        }

        return models.WorkManagementPermission.findAll({
          where: {
            projectTemplateId: project.templateId,
          },
        });
      })
      .then((allPermissions) => {
        workManagementPermissions = allPermissions;
        return Promise.all(_.map(workManagementPermissions, workManagementPermission =>
          util.hasPermissionForProject(workManagementPermission.permission, req.authUser, projectId)),
        );
      })
      .then((accesses) => {
        const allAccess = {};
        _.each(workManagementPermissions, (p, ind) => {
          if (accesses[ind]) {
            allAccess[`${p.policy}`] = accesses[ind];
          }
        });
        res.json(util.wrapResponse(req.id, allAccess));
      })
      .catch(next);
  },
];
