import validate from 'express-validation';
import _ from 'lodash';
import Joi from 'joi';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import models from '../../models';
import util from '../../util';
import { INVITE_STATUS, EVENT, RESOURCES } from '../../constants';
import { PERMISSION } from '../../permissions/constants';

/**
 * API to update invite member to project.
 *
 */
const permissions = tcMiddleware.permissions;

const updateMemberValidations = {
  body: Joi.object()
    .keys({
      status: Joi.any()
        .valid(_.values(INVITE_STATUS))
        .required(),
    })
    .required(),
};

module.exports = [
  // handles request validations
  validate(updateMemberValidations),
  permissions('projectMemberInvite.edit'),
  (req, res, next) => {
    const newStatus = req.body.status;
    if (newStatus === INVITE_STATUS.CANCELED) {
      const err = new Error('Cannot change invite status to “canceled”. Please, delete the invite instead.');
      err.status = 400;
      return next(err);
    }
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
        req.log.debug('Checking user permission for updating invite');
        let error = null;

        if (
          invite.status === INVITE_STATUS.REQUESTED
          && !util.hasPermissionByReq(PERMISSION.UPDATE_PROJECT_INVITE_REQUESTED, req)
        ) {
          error = 'You don\'t have permissions to update requested invites.';
        } else if (
          invite.status !== INVITE_STATUS.REQUESTED
          && !ownInvite
          && !util.hasPermissionByReq(PERMISSION.UPDATE_PROJECT_INVITE_NOT_OWN, req)
        ) {
          error = 'You don\'t have permissions to update invites for other users.';
        }

        if (error) {
          const err = new Error(error);
          err.status = 403;
          return next(err);
        }

        req.log.debug('Updating invite status');
        return invite
          .update({
            status: newStatus,
          })
          .then((updatedInvite) => {
            // emit the event
            util.sendResourceToKafkaBus(
              req,
              EVENT.ROUTING_KEY.PROJECT_MEMBER_INVITE_UPDATED,
              RESOURCES.PROJECT_MEMBER_INVITE,
              updatedInvite.toJSON());

            req.log.debug('Adding user to project');
            // add user to project if accept invite
            if (updatedInvite.status === INVITE_STATUS.ACCEPTED ||
              updatedInvite.status === INVITE_STATUS.REQUEST_APPROVED) {
              return models.ProjectMember.getActiveProjectMembers(projectId)
                .then((members) => {
                  req.context = req.context || {};
                  req.context.currentProjectMembers = members;
                  let userId = updatedInvite.userId;
                  // if the requesting user is updating his/her own invite
                  if (!userId && currentUserEmail === updatedInvite.email) {
                    userId = currentUserId;
                  }
                  // if we are not able to identify the user yet, it must be something wrong and we should not create
                  // project member
                  if (!userId) {
                    const err = new Error(
                      `Unable to find userId for the invite. ${updatedInvite.email} has not joined topcoder yet.`);
                    err.status = 400;
                    return next(err);
                  }
                  const member = {
                    projectId,
                    role: updatedInvite.role,
                    userId,
                    createdBy: req.authUser.userId,
                    updatedBy: req.authUser.userId,
                  };
                  return util
                    .addUserToProject(req, member)
                    .then(() => res.json(util.postProcessInvites('$.email', updatedInvite, req)))
                    .catch(err => next(err));
                });
            }
            return res.json(util.postProcessInvites('$.email', updatedInvite, req));
          });
      })
      .catch(next);
  },
];
