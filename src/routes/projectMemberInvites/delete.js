import _ from 'lodash';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import models from '../../models';
import util from '../../util';
import { PROJECT_MEMBER_ROLE, INVITE_STATUS, EVENT, RESOURCES } from '../../constants';
import { PERMISSION } from '../../permissions/constants';

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
    const currentUserEmail = req.authUser.email ? req.authUser.email.toLowerCase() : req.authUser.email;
    const currentUserId = req.authUser.userId;

    // get invite by id and project id
    return models.ProjectMemberInvite.getPendingOrRequestedProjectInviteById(projectId, inviteId)
      .then((invite) => {
        // if invite doesn't exist, return 404
        if (!invite) {
          const err = new Error(`invite not found for project id ${projectId}, inviteId ${inviteId},` +
            ` email ${currentUserEmail} and userId ${currentUserId}`,
          );
          err.status = 404;
          return next(err);
        }
        // check this invitation is for logged-in user or not
        const ownInvite = (!!invite && (invite.userId === currentUserId || invite.email === currentUserEmail));

        // check permission
        req.log.debug('Checking user permission for deleting invite');
        let error = null;

        if (
          invite.status === INVITE_STATUS.REQUESTED
          && !util.hasPermissionByReq(PERMISSION.DELETE_PROJECT_INVITE_REQUESTED, req)
        ) {
          error = 'You don\'t have permissions to cancel requested invites.';
        } else if (
          invite.role !== PROJECT_MEMBER_ROLE.CUSTOMER
          && invite.role !== PROJECT_MEMBER_ROLE.COPILOT
          && !ownInvite
          && !util.hasPermissionByReq(PERMISSION.DELETE_PROJECT_INVITE_NOT_OWN_TOPCODER, req)
        ) {
          error = 'You don\'t have permissions to cancel invites to Topcoder Team for other users.';
        } else if (
          invite.role === PROJECT_MEMBER_ROLE.CUSTOMER
          && !ownInvite
          && !util.hasPermissionByReq(PERMISSION.DELETE_PROJECT_INVITE_NOT_OWN_CUSTOMER, req)
        ) {
          error = 'You don\'t have permissions to cancel invites to Customer Team for other users.';
        } else if (
          invite.role === PROJECT_MEMBER_ROLE.COPILOT
          && !ownInvite
          && !util.hasPermissionByReq(PERMISSION.DELETE_PROJECT_INVITE_NOT_OWN_COPILOT, req)
        ) {
          error = 'You don\'t have permissions to cancel invites to Copilot Team for other users.';
        }

        if (error) {
          const err = new Error(error);
          err.status = 403;
          return next(err);
        }

        req.log.debug('Deleting (canceling) invite');
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
      })
      .catch(next);
  },
];
