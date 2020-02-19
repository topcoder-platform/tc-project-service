import _ from 'lodash';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import models from '../../models';
import util from '../../util';
import { PROJECT_MEMBER_ROLE, MANAGER_ROLES, INVITE_STATUS, EVENT, RESOURCES, USER_ROLE } from '../../constants';

/**
 * API to delete invite member to project.
 *
 */
const permissions = tcMiddleware.permissions;

module.exports = [
  permissions('projectMemberInvite.delete'),
  (req, res, next) => {
    const projectId = _.parseInt(req.params.projectId);
    const inviteId = _.parseInt(req.params.inviteId);
    const email = req.authUser.email;
    const currentUserId = req.authUser.userId;

    // check user has admin role or manager role.
    const adminAccess = util.hasRoles(req, [USER_ROLE.CONNECT_ADMIN, USER_ROLE.COPILOT_MANAGER]);
    const managerAccess = util.hasRoles(req, MANAGER_ROLES);

    // get invite by id and project id
    return models.ProjectMemberInvite.getPendingOrRequestedProjectInviteById(projectId, inviteId)
      .then((invite) => {
        // if invite doesn't exist, return 404
        if (!invite) {
          const err = new Error(`invite not found for project id ${projectId}, inviteId ${inviteId},` +
            ` email ${email} and userId ${currentUserId}`,
          );
          err.status = 404;
          return next(err);
        }
        // check this invitation is for logged-in user or not
        const ownInvite = (!!invite && (invite.userId === currentUserId || invite.email === email));
        // check permission
        req.log.debug('Checking user permission for updating invite');
        let error = null;
        if (invite.status === INVITE_STATUS.REQUESTED && !adminAccess) {
          error = 'Requested invites can only be canceled by Copilot manager';
        } else if (!managerAccess && invite.role !== PROJECT_MEMBER_ROLE.CUSTOMER) {
          error = `Project members can cancel invites only for ${PROJECT_MEMBER_ROLE.CUSTOMER}`;
        } else if (!adminAccess && !ownInvite) {
          error = 'Project members can only cancel invites for themselves';
        }

        if (error) {
          const err = new Error(error);
          err.status = 403;
          return next(err);
        }

        req.log.debug('Canceling invite');
        return invite
          .update({
            status: INVITE_STATUS.CANCELED,
          })
          .then((updatedInvite) => {
            // emit the event
            util.sendResourceToKafkaBus(
              req,
              EVENT.ROUTING_KEY.PROJECT_MEMBER_INVITE_REMOVED,
              RESOURCES.PROJECT_MEMBER_INVITE,
              updatedInvite.toJSON());

            res.status(204).end();
          });
      });
  },
];
