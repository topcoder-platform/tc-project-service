
import _ from 'lodash';
import util from '../util';
import models from '../models';

/**
 * Based on allowRule and denyRule allow/deny users to execute the policy
 * @param {String}    policy      the work management permission policy
 * @return {Promise}              Returns a promise
 */
module.exports = policy => req => new Promise((resolve, reject) => {
  const projectId = _.parseInt(req.params.projectId);

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
        return null;
      }

      return models.WorkManagementPermissions.findOne({
        where: {
          policy,
          projectTemplateId: project.templateId,
        },
      });
    })
    .then((permission) => {
      if (!permission) {
        return false;
      }

      return util.hasPermissionForProject(permission, req.authUser, projectId);
    })
    .then((hasAccess) => {
      if (!hasAccess) {
        const errorMessage = 'You do not have permissions to perform this action';
        return reject(new Error(errorMessage));
      }
      return resolve(true);
    });
});
