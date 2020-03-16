/**
 * Allow any logged-in users to access project based URL.
 *
 * The main purpose of using this policy is to populate `req.context.currentProjectMembers`.
 *
 * NOTE
 *   This policy can be only applied for routes with projectId.
 */

import _ from 'lodash';
import models from '../models';

module.exports = (req) => {
  if (_.isUndefined(req.params.projectId)) {
    return Promise.reject(new Error('Policy "project.anyAuthUser" cannot be used for route without "projectId".'));
  }

  const projectId = _.parseInt(req.params.projectId);

  return models.ProjectMember.getActiveProjectMembers(projectId)
    .then((members) => {
      req.context = req.context || {};
      req.context.currentProjectMembers = members;

      return true;
    });
};
