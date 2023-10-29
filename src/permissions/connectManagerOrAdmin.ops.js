import _ from 'lodash';
import util from '../util';
import { MANAGER_ROLES } from '../constants';
import models from '../models';


/**
 * Only Connect Manager, Connect Admin, and administrator are allowed to perform the operations
 * @param {Object}    req         the express request instance
 * @return {Promise}              returns a promise
 */
module.exports = req => new Promise(async (resolve, reject) => {
  const hasAccess = util.hasRoles(req, MANAGER_ROLES);

  if (!hasAccess) {
    return reject(new Error('You do not have permissions to perform this action'));
  }
  let projectId = req.params.projectId;
  if (projectId) {
    projectId = _.parseInt(projectId);
    const members = await models.ProjectMember.getActiveProjectMembers(projectId);
    req.context = req.context || {};
    req.context.currentProjectMembers = members;
  }

  return resolve(true);
});
