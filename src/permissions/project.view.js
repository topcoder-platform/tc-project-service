
import _ from 'lodash';
import util from '../util';
import models from '../models';
import { MANAGER_ROLES } from '../constants';

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
          || util.hasRoles(req, MANAGER_ROLES)
          || !_.isUndefined(_.find(members, m => m.userId === currentUserId));

      return Promise.resolve(hasAccess);
    })
    .then((hasAccess) => {
      if (!hasAccess) {
        const errorMessage = 'You do not have permissions to perform this action';
        // user is not an admin nor is a registered project member
        return reject(new Error(errorMessage));
      }
      return resolve(true);
    });
});
