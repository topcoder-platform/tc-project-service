
import _ from 'lodash';
import util from '../util';
import models from '../models';

/**
 * Allow/Deny based on projectSetting writePermission
 * @param   {Object}  req         the request
 * @return {Promise}              Returns a promise
 */
module.exports = req => new Promise((resolve, reject) => {
  const projectId = _.parseInt(req.params.projectId);
  const id = _.parseInt(req.params.id);

  return models.Project.findOne({
    where: {
      id: projectId,
    },
  })
    .then((project) => {
      if (!project) {
        return resolve(true);
      }

      return models.ProjectSetting.findOne({
        includeAllProjectSettingsForInternalUsage: true,
        where: {
          projectId,
          id,
        },
      });
    })
    .then((setting) => {
      if (!setting) {
        return resolve(true);
      }

      return util.hasPermissionForProject(setting.writePermission, req.authUser, projectId);
    })
    .then((hasAccess) => {
      if (!hasAccess) {
        const errorMessage = 'You do not have permissions to perform this action';
        return reject(new Error(errorMessage));
      }
      return resolve(true);
    });
});
