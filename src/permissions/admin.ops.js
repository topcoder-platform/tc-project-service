import util from '../util';

/**
 * Only super admin are allowed to perform admin operations
 * @param {Object}    freq        the express request instance
 * @return {Promise}              Returns a promise
 */
module.exports = freq => new Promise((resolve, reject) => {
  const req = freq;
  req.context = req.context || {};
  // check if auth user has acecss to this project
  const hasAccess = util.hasAdminRole(req);

  if (!hasAccess) {
    // user is not an admin nor is a registered project member
    return reject(new Error('You do not have permissions to perform this action'));
  }
  return resolve(true);
});
