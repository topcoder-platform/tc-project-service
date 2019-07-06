import _ from 'lodash';
import util from '../util';
import {
  USER_ROLE,
  PROJECT_MEMBER_MANAGER_ROLES,
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

  const isManagerOrCopilot = util.hasRoles(req, [
    ...PROJECT_MEMBER_MANAGER_ROLES,
    USER_ROLE.MANAGER,
    USER_ROLE.TOPCODER_ACCOUNT_MANAGER,
    USER_ROLE.COPILOT,
    USER_ROLE.COPILOT_MANAGER,
  ]);

  if (isManagerOrCopilot) {
    return models.ProjectMember.getActiveProjectMembers(projectId)
      .then((members) => {
        req.context = req.context || {};
        req.context.currentProjectMembers = members;
        // check if the copilot or manager has access to this project
        const isMember = _.some(members, m => m.userId === req.authUser.userId);

        if (!isMember) {
          // the copilot or manager is not a registered project member
          return reject(new Error('You do not have permissions to perform this action'));
        }
        return resolve(true);
      });
  }

  return reject(new Error('You do not have permissions to perform this action'));
});
