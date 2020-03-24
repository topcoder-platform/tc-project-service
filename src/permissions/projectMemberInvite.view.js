
import _ from 'lodash';
import util from '../util';
import models from '../models';
import { MANAGER_ROLES } from '../constants';

/**
 * Check user can view project member invite or not.
 * Users who can view the project can see all invites. Logged-in user can only see invitations
 * for himself/herself.
 * @param {Object}    freq        the express request instance
 * @return {Promise}              Returns a promise
 */
module.exports = freq => new Promise((resolve) => {
  const req = freq;
  const projectId = _.parseInt(freq.params.projectId);
  const currentUserId = freq.authUser.userId;
  let hasAccess;
  return models.ProjectMember.getActiveProjectMembers(projectId)
        .then((members) => {
          req.context = req.context || {};
            // check if auth user has acecss to this project
          hasAccess = util.hasAdminRole(req)
                || util.hasRoles(req, MANAGER_ROLES)
                || !_.isUndefined(_.find(members, m => m.userId === currentUserId));
          if (hasAccess) {
                // if user can "view" the project, he/she can see all invites
                // save this info into request.
            req.context.inviteType = 'all';
          } else {
                // user can only see invitations for himself/herself in this project
            req.context.inviteType = 'list';
          }
          return resolve(true);
        });
});
