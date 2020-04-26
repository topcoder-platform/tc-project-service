
/**
 * General method to check that user has permissions to call particular route.
 *
 * This "middleware" uses unified permissions rules to check access.
 *
 * Usage:
 *   ```js
 *   Authorizer.setPolicy('project.view', generalPermission(PERMISSION.VIEW_PROJECT));
 *   ```
 *
 *    where `PERMISSION.VIEW_PROJECT` is defined as any object which could be processed by
 *    the method `util.hasPermission`.
 */
import _ from 'lodash';
import util from '../util';
import models from '../models';

module.exports = permission => async (req) => {
  const projectId = _.parseInt(req.params.projectId);

  // if `permission` requires to know Project Members, but current route doesn't belong to any project
  // this means such `permission` most likely has been applied by mistake, so we throw an error
  if (_.isUndefined(req.params.projectId) && util.isPermissionRequireProjectMembers(permission)) {
    throw new Error(`Permission ${JSON.stringify(permission)} requires Project Members` +
      ', but this route doesn\'t have "projectId".');

  // if we have `projectId`, then retrieve project members no matter if `permission` requires them or no
  // as we often need them inside `context.currentProjectMembers`, so we always load them for consistency
  } if (!_.isUndefined(req.params.projectId)) {
    try {
      const projectMembers = await models.ProjectMember.getActiveProjectMembers(projectId);
      req.context = req.context || {};
      req.context.currentProjectMembers = projectMembers;
    } catch (err) {
      // if we could not load members this usually means that project doesn't exists
      // anyway we proceed without members, which could lead to 2 situations:
      // - if user doesn't have permissions to access endpoint without us knowing if he is a member or no,
      //   then for such a user request would fail with 403
      // - if user has permissions to access endpoint even we don't know if he is a member or no,
      //   then code would proceed and endpoint would decide to throw 404 if project doesn't exist
      //   or perform endpoint operation if loading project members above failed because of some other reason
    }
  }


  if (!util.hasPermissionByReq(permission, req)) {
    throw new Error('You do not have permissions to perform this action');
  }
};
