import validate from 'express-validation';
import _ from 'lodash';
import Joi from 'joi';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import models from '../../models';
import util from '../../util';
import { PROJECT_MEMBER_ROLE, MANAGER_ROLES, INVITE_STATUS, EVENT, RESOURCES, USER_ROLE } from '../../constants';

/**
 * API to update invite member to project.
 *
 */
const permissions = tcMiddleware.permissions;

const updateMemberValidations = {
  body: Joi.object()
      .keys({
        userId: Joi.number().optional(),
        email: Joi.string()
          .email()
          .optional(),
        status: Joi.any()
          .valid(_.values(INVITE_STATUS))
          .required(),
      })
      .required(),
};

module.exports = [
  // handles request validations
  validate(updateMemberValidations),
  permissions('projectMemberInvite.put'),
  (req, res, next) => {
    const putInvite = req.body;
    const projectId = _.parseInt(req.params.projectId);

    // userId or email should be provided
    if (!putInvite.userId && !putInvite.email) {
      const err = new Error('userId or email should be provided');
      err.status = 400;
      return next(err);
    }

    let invite;
    let requestedInvite;
    return models.ProjectMemberInvite.getPendingInviteByEmailOrUserId(
      projectId,
      putInvite.email,
      putInvite.userId,
    ).then((_invite) => {
      invite = _invite;
    }).then(() => models.ProjectMemberInvite.getRequestedInvite(projectId, putInvite.userId))
    .then((_requestedInvite) => {
      requestedInvite = _requestedInvite;
      if (!invite && !requestedInvite) {
        // check there is an existing invite for the user with status PENDING
        // handle 404
        const err = new Error(
          `invite not found for project id ${projectId}, email ${putInvite.email} and userId ${putInvite.userId}`,
        );
        err.status = 404;
        return next(err);
      }

      invite = invite || requestedInvite;

      req.log.debug('Chekcing user permission for updating invite');
      let error = null;
      if (invite.status === INVITE_STATUS.REQUESTED &&
          !util.hasRoles(req, [USER_ROLE.CONNECT_ADMIN, USER_ROLE.COPILOT_MANAGER])) {
        error = 'Requested invites can only be updated by Copilot manager';
      } else if (putInvite.status === INVITE_STATUS.CANCELED) {
        if (!util.hasRoles(req, MANAGER_ROLES) && invite.role !== PROJECT_MEMBER_ROLE.CUSTOMER) {
          error = `Project members can cancel invites only for ${PROJECT_MEMBER_ROLE.CUSTOMER}`;
        }
      } else if (((!!putInvite.userId && putInvite.userId !== req.authUser.userId) ||
                 (!!putInvite.email && putInvite.email !== req.authUser.email)) &&
                 !util.hasRoles(req, [USER_ROLE.CONNECT_ADMIN, USER_ROLE.COPILOT_MANAGER])) {
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
          status: putInvite.status,
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
                if (!userId && req.authUser.email === updatedInvite.email) {
                  userId = req.authUser.userId;
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
                  .then(() => res.json(updatedInvite))
                  .catch(err => next(err));
              });
          }
          return res.json(updatedInvite);
        });
    });
  },
];
