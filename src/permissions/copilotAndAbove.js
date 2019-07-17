import _ from 'lodash';
import util from '../util';
import {
  PROJECT_MEMBER_ROLE,
  ADMIN_ROLES,
} from '../constants';
import models from '../models';


/**
 * Permission to allow copilot and above roles to perform certain operations
 * - User with Topcoder admins roles should be able to perform the operations.
 * - Project members with copilot and manager Project roles should be also able to perform the operations.
 * @param {Object}    req         the express request instance
 * @return {Promise}              returns a promise
 */
module.exports = req => new Promise((resolve, reject) => {
  const projectId = _.parseInt(req.params.projectId);
  const isAdmin = util.hasRoles(req, ADMIN_ROLES);

  if (isAdmin) {
    return resolve(true);
  }

  return models.ProjectMember.getActiveProjectMembers(projectId)
    .then((members) => {
      req.context = req.context || {};
      req.context.currentProjectMembers = members;
      const validMemberProjectRoles = [
        PROJECT_MEMBER_ROLE.MANAGER,
        PROJECT_MEMBER_ROLE.COPILOT,
      ];
      // check if the copilot or manager has access to this project
      const isMember = _.some(
        members,
m => m.userId === req.authUser.userId && validMemberProjectRoles.includes(m.role),
      );

      if (!isMember) {
        // the copilot or manager is not a registered project member
        return reject(new Error('You do not have permissions to perform this action'));
      }
      return resolve(true);
    });
});
