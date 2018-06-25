import util from '../util';
import { MANAGER_ROLES, USER_ROLE } from '../constants';


/**
 * Permission to alloow copilot and above roles to perform certain operations
 * @param {Object}    req         the express request instance
 * @return {Promise}              returns a promise
 */
module.exports = req => new Promise((resolve, reject) => {
  const hasAccess = util.hasRoles(req, [...MANAGER_ROLES, USER_ROLE.COPILOT]);

  if (!hasAccess) {
    return reject(new Error('You do not have permissions to perform this action'));
  }

  return resolve(true);
});
