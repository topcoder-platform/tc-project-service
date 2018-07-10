
import _ from 'lodash';
import util from '../util';
import models from '../models';
import { USER_ROLE, PROJECT_STATUS, PROJECT_MEMBER_ROLE } from '../constants';

/**
 * Super admin, Topcoder Managers are allowed to view any projects
 * Co-pilots can view projects they are part of or if no other co-pilot has been
 * assigned. Others can only view projcets that they are part of.
 * @param {Object}    freq        the express request instance
 * @return {Promise}              Returns a promise
 */
module.exports = freq => new Promise((resolve, reject) => {
  const projectId = _.parseInt(freq.params.projectId);
  const currentUserId = freq.authUser.userId;
  return models.ProjectMember.getActiveProjectMembers(projectId)
      .then((members) => {
        const req = freq;
        req.context = req.context || {};
        req.context.currentProjectMembers = members;
        // check if auth user has acecss to this project
        const hasAccess = util.hasAdminRole(req)
          || util.hasRole(req, USER_ROLE.MANAGER)
          || !_.isUndefined(_.find(members, m => m.userId === currentUserId));

        // if user is co-pilot and the project doesn't have any copilots then
        // user can access the project
        if (!hasAccess && util.hasRole(req, USER_ROLE.COPILOT)) {
          return models.Project.getProjectIdsForCopilot(currentUserId)
            .then((ids) => {
              req.context.accessibleProjectIds = ids;
              return Promise.resolve(_.indexOf(ids, projectId) > -1);
            });
        }
        return Promise.resolve(hasAccess);
      })
      .then((hasAccess) => {
        if (!hasAccess) {
          let errorMessage = 'You do not have permissions to perform this action';
          // customize error message for copilots
          if (util.hasRole(freq, USER_ROLE.COPILOT)) {
            if (_.findIndex(freq.context.currentProjectMembers, m => m.role === PROJECT_MEMBER_ROLE.COPILOT) >= 0) {
              errorMessage = 'Copilot: Project is already claimed by another copilot';
              return Promise.resolve(errorMessage);
            }
            return models.Project
                .find({
                  where: { id: projectId },
                  attributes: ['status'],
                  raw: true,
                })
                .then((project) => {
                  if (!project || [PROJECT_STATUS.DRAFT, PROJECT_STATUS.IN_REVIEW].indexOf(project.status) >= 0) {
                    errorMessage = 'Copilot: Project is not yet available to copilots';
                  } else {
                    // project status is 'active' or higher so it's not available to copilots
                    errorMessage = 'Copilot: Project has already started';
                  }
                  return Promise.resolve(errorMessage);
                });
          }
            // user is not an admin nor is a registered project member
          return Promise.resolve(errorMessage);
        }
        return Promise.resolve(null);
      }).then((errorMessage) => {
        if (errorMessage) {
          // user is not an admin nor is a registered project member
          return reject(new Error(errorMessage));
        }
        return resolve(true);
      });
});
