import _ from 'lodash';
import util from '../util';
import models from '../models';
import { PERMISSION } from './constants';

/**
 * Permission to allow copilot and above roles to perform certain operations
 * - User with Topcoder admins roles should be able to perform the operations.
 * - Project members with copilot and manager Project roles should be also able to perform the operations.
 * @param {Object}    req         the express request instance
 * @return {Promise}              returns a promise
 */
module.exports = req => new Promise((resolve, reject) => {
  const projectId = _.parseInt(req.params.projectId);

  return models.ProjectMember.getActiveProjectMembers(projectId)
    .then((members) => {
      req.context = req.context || {};
      req.context.currentProjectMembers = members;

      const hasPermission = util.hasPermissionByReq(PERMISSION.ROLES_COPILOT_AND_ABOVE, req);

      if (!hasPermission) {
        // the copilot or manager is not a registered project member
        return reject(new Error('You do not have permissions to perform this action'));
      }
      return resolve(true);
    });
});
