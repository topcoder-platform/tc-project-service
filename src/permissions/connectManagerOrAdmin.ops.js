import util from '../util';
import { MANAGER_ROLES } from '../constants';


/**
 * Only Connect Manager, Connect Admin, and administrator are allowed to perform the operations
 * @param {Object}    req         the express request instance
 * @return {Promise}              returns a promise
 */
module.exports = req => new Promise((resolve, reject) => {
  const hasAccess = util.hasRoles(req, MANAGER_ROLES);

  if (!hasAccess) {
    return reject(new Error('You do not have permissions to perform this action'));
  }

  return resolve(true);
});
