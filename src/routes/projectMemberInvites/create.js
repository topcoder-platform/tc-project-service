

import validate from 'express-validation';
import _ from 'lodash';
import Joi from 'joi';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import models from '../../models';
import util from '../../util';
import { PROJECT_MEMBER_ROLE, PROJECT_MEMBER_MANAGER_ROLES,
  MANAGER_ROLES, INVITE_STATUS, EVENT } from '../../constants';

/**
 * API to create member invite to project.
 *
 */
const permissions = tcMiddleware.permissions;

const addMemberValidations = {
  body: {
    param: Joi.object().keys({
      userIds: Joi.array().items(Joi.number()).optional().min(1),
      emails: Joi.array().items(Joi.string().email()).optional().min(1),
      role: Joi.any().valid(_.values(PROJECT_MEMBER_ROLE)).required(),
    }).required(),
  },
};

module.exports = [
  // handles request validations
  validate(addMemberValidations),
  permissions('projectMemberInvite.create'),
  (req, res, next) => {
    const invite = req.body.param;

    if (!invite.userIds && !invite.emails) {
      const err = new Error('Either userIds or emails are required');
      err.status = 400;
      return next(err);
    }

    if (!util.hasRoles(req, MANAGER_ROLES) && invite.role !== PROJECT_MEMBER_ROLE.CUSTOMER) {
      const err = new Error(`You are not allowed to invite user as ${invite.role}`);
      err.status = 403;
      return next(err);
    }

    const members = req.context.currentProjectMembers;
    const projectId = _.parseInt(req.params.projectId);

    const promises = [];
    if (invite.userIds) {
        // permission:
        // user has to have constants.MANAGER_ROLES role
        // to be invited as PROJECT_MEMBER_ROLE.MANAGER
      if (invite.role === PROJECT_MEMBER_ROLE.MANAGER) {
        _.forEach(invite.userIds, (userId) => {
          req.log.info(userId);
          promises.push(util.getUserRoles(userId, req.log, req.id));
        });
      }

        // validate each userId is not already a member
      const alreadyMembers = [];
      _.forEach(members, (member) => {
        if (invite.userIds.includes(member.userId)) {
          alreadyMembers.push(member.userId);
        }
      });
      if (alreadyMembers.length > 0) {
        const err = new Error(`${alreadyMembers.join()} are already members of project ${projectId}`);
        err.status = 400;
        return next(err);
      }
    }

    if (invite.emails) {
        // email invites can only be used for CUSTOMER role
      if (invite.role !== PROJECT_MEMBER_ROLE.CUSTOMER) {  // eslint-disable-line no-lonely-if
        const err = new Error(`Emails can only be used for ${PROJECT_MEMBER_ROLE.CUSTOMER}`);
        err.status = 400;
        return next(err);
      }
    }

    if (promises.length === 0) {
      promises.push(Promise.resolve());
    }
    return Promise.all(promises).then((rolesList) => {
      if (!!invite.userIds && _.includes(PROJECT_MEMBER_MANAGER_ROLES, invite.role)) {
        req.log.debug('Chekcing if userId is allowed as manager');
        const forbidUserList = [];
        _.zip(invite.userIds, rolesList).forEach((data) => {
          const [userId, roles] = data;

          if (!util.hasIntersection(MANAGER_ROLES, roles)) {
            forbidUserList.push(userId);
          }
        });
        if (forbidUserList.length > 0) {
          const err = new Error(`${forbidUserList.join()} cannot be added with a Manager role to the project`);
          err.status = 403;
          return next(err);
        }
      }
      return models.ProjectMemberInvite.getPendingInvitesForProject(projectId)
            .then((invites) => {
              req.log.debug('Chekcing if user has been invited');
              // validate for each userId/email there is no existing invitation
              const alreadyInvites = [];
              _.forEach(invites, (i) => {
                if (invite.userIds) {
                  if (invite.userIds.includes(i.userId)) {
                    alreadyInvites.push(i.userId);
                  }
                } else if (invite.emails.includes(i.email)) {
                  alreadyInvites.push(i.email);
                }
              });
              if (alreadyInvites.length > 0) {
                const err = new Error(`${alreadyInvites.join()} are already invited`);
                err.status = 400;
                return next(err);
              }

              const data = {
                projectId,
                role: invite.role,
                status: INVITE_STATUS.PENDING,
                createdBy: req.authUser.userId,
                updatedBy: req.authUser.userId,
              };
              const invitePromises = [];
              if (invite.userIds) {
                invite.userIds.forEach((userId) => {
                  const dataNew = _.clone(data);
                  _.assign(dataNew, {
                    userId,
                  });
                  invitePromises.push(models.ProjectMemberInvite.create(dataNew));
                });
              }
              data.userId = null;

              if (invite.emails) {
                invite.emails.forEach((email) => {
                  const dataNew = _.clone(data);
                  _.assign(dataNew, {
                    email,
                  });
                  invitePromises.push(models.ProjectMemberInvite.create(dataNew));
                });
              }

              req.log.debug('Creating invites');
              return models.sequelize.Promise.all(invitePromises)
                .then((values) => {
                  values.forEach((v) => {
                    req.app.emit(EVENT.ROUTING_KEY.PROJECT_MEMBER_INVITE_CREATED, {
                      req,
                      userId: v.userId,
                      email: v.email,
                    });
                    req.app.services.pubsub.publish(
                            EVENT.ROUTING_KEY.PROJECT_MEMBER_INVITE_CREATED,
                            v,
                            { correlationId: req.id },
                        );
                  });
                  return res.status(201).json(util.wrapResponse(req.id, values, null, 201));
                });
            });
    }).catch(err => next(err));
  },
];
