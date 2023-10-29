
import _ from 'lodash';
import util from '../util';
import models from '../models';
import { MANAGER_ROLES } from '../constants';

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

      return models.WorkManagementPermission.findOne({
        where: {
          policy,
          projectTemplateId: project.templateId,
        },
      });
    })
    .then((workManagementPermission) => {
      if (!workManagementPermission) {
        // TODO REMOVE THIS!!!
        // TEMPORARY let all the Topcoder managers to do all the work management
        // if there are no permission records in the DB for the template
        return util.hasPermissionByReq({ topcoderRoles: MANAGER_ROLES }, req);
        // return false;
      }

      return util.hasPermissionForProject(workManagementPermission.permission, req.authUser, projectId);
    })
    .then((hasAccess) => {
      if (!hasAccess) {
        const errorMessage = 'You do not have permissions to perform this action';
        return reject(new Error(errorMessage));
      }
      return resolve(true);
    });
});
