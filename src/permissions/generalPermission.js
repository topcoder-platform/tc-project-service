
/**
 * General method to check that user has permissions to call particular route.
 *
 * This "middleware" uses unified permissions rules to check access.
 *
 * - `permissions` can be an array of permissions rules or one permission rule object
 *
 * Usage:
 *   1. One permission
 *      ```js
 *      Authorizer.setPolicy('project.view', generalPermission(PERMISSION.VIEW_PROJECT));
 *      ```
 *
 *       where `PERMISSION.VIEW_PROJECT` is defined as any object which could be processed by
 *       the method `util.hasPermission`.
 *
 *   2. Multiple permissions
 *      ```js
 *      Authorizer.setPolicy('project.view', generalPermission([
 *        PERMISSION.READ_PROJECT_INVITE_OWN,
 *        PERMISSION.READ_PROJECT_INVITE_NOT_OWN,
 *      ]));
 *      ```
 *
 *      In this case if user who is making request has at least of one listed permissions access would be allowed.
 */
import _ from 'lodash';
import util from '../util';
import models from '../models';

/**
 * @param {Object|Array} permissions permission object or array of permissions
 *
 * @return {Function} which would be resolved if `req` is allowed and rejected otherwise
 */
module.exports = permissions => async (req) => {
  const projectId = _.parseInt(req.params.projectId);

  // if one of the `permission` requires to know Project Members, but current route doesn't belong to any project
  // this means such `permission` most likely has been applied by mistake, so we throw an error
  const permissionsRequireProjectMembers = _.isArray(permissions)
    ? _.some(permissions, permission => util.isPermissionRequireProjectMembers(permission))
    : util.isPermissionRequireProjectMembers(permissions);

  if (_.isUndefined(req.params.projectId) && permissionsRequireProjectMembers) {
    throw new Error('Permissions for this route requires Project Members' +
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
      req.log.error(`Cannot load project members: ${err.message}.`);
    }
  }

  const hasPermission = _.isArray(permissions)
    ? _.some(permissions, permission => util.hasPermissionByReq(permission, req))
    : util.hasPermissionByReq(permissions, req);

  if (!hasPermission) {
    throw new Error('You do not have permissions to perform this action');
  }
};
