import util from '../util';
import models from '../models';

/**
 * Only users who have "writePermission" of ProjectSetting can edit this entity.
 * @param {Object}    freq        the express request instance
 * @return {Promise}              Returns a promise
 */
module.exports = freq => new Promise((resolve, reject) => {
  const projectId = freq.params.projectId;
  const settingId = freq.params.id;
  let projectMembers = [];

  return models.ProjectMember.getActiveProjectMembers(projectId)
    .then((members) => {
      const req = freq;
      req.context = req.context || {};
      req.context.currentProjectMembers = members;

      projectMembers = members;
      return Promise.resolve();
    })
    .then(() => models.ProjectSetting.findOne({
      where: { projectId, id: settingId },
      raw: true,
      includeAllProjectSettingsForInternalUsage: true,
    }).then((setting) => {
      if (!setting) {
        // let route handle this 404 error.
        return resolve(true);
      }
      const hasAccess = util.hasPermission(setting.writePermission, freq.authUser, projectMembers);
      if (!hasAccess) {
        const errorMessage = 'You do not have permissions to perform this action';
        // user is not an admin nor is a registered project member
        return reject(new Error(errorMessage));
      }
      return resolve(true);
    }));
});
