import validate from 'express-validation';
import _ from 'lodash';
import Joi from 'joi';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import models from '../../models';
import util from '../../util';
import { INVITE_STATUS, EVENT, RESOURCES, USER_ROLE } from '../../constants';

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
    const email = req.authUser.email;
    const currentUserId = req.authUser.userId;

    // check user has admin role or manager role.
    const adminAccess = util.hasRoles(req, [USER_ROLE.CONNECT_ADMIN, USER_ROLE.COPILOT_MANAGER]);

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
          error = 'Requested invites can only be updated by Copilot manager';
        } else if (!adminAccess && !ownInvite) {
          error = 'Project members can only update invites for themselves';
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

            req.app.services.pubsub.publish(EVENT.ROUTING_KEY.PROJECT_MEMBER_INVITE_UPDATED, updatedInvite, {
              correlationId: req.id,
            });

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
                  if (!userId && email === updatedInvite.email) {
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
                    .then(() => res.json(util.maskInviteEmails('$.email', updatedInvite, req)))
                    .catch(err => next(err));
                });
            }
            return res.json(util.maskInviteEmails('$.email', updatedInvite, req));
          });
      });
  },
];
