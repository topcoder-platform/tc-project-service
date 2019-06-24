import _ from 'lodash';
import Joi from 'joi';
import validate from 'express-validation';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import util from '../../util';
import { INVITE_STATUS, MANAGER_ROLES, PROJECT_MEMBER_ROLE, USER_ROLE, EVENT, RESOURCES } from '../../constants';
import models from '../../models';

/**
 * API to add a project member.
 * add members directly (only managers and copilots)
 * user being added is current user
 */
const permissions = tcMiddleware.permissions;

const createProjectMemberValidations = {
  body: Joi.object().keys({
    role: Joi.any()
          .valid(PROJECT_MEMBER_ROLE.MANAGER, PROJECT_MEMBER_ROLE.ACCOUNT_MANAGER, PROJECT_MEMBER_ROLE.COPILOT),
  }),
};

module.exports = [
  // handles request validations
  validate(createProjectMemberValidations),
  permissions('project.addMember'),
  (req, res, next) => {
    let targetRole;
    if (_.get(req, 'body.role')) {
      targetRole = _.get(req, 'body.role');

      if (PROJECT_MEMBER_ROLE.MANAGER === targetRole &&
        !util.hasRoles(req, [USER_ROLE.MANAGER])) {
        const err = new Error(`Only manager is able to join as ${targetRole}`);
        err.status = 401;
        return next(err);
      }

      if (PROJECT_MEMBER_ROLE.ACCOUNT_MANAGER === targetRole &&
        !util.hasRoles(req, [USER_ROLE.MANAGER, USER_ROLE.TOPCODER_ACCOUNT_MANAGER])) {
        const err = new Error(`Only manager  or account manager is able to join as ${targetRole}`);
        err.status = 401;
        return next(err);
      }

      if (targetRole === PROJECT_MEMBER_ROLE.COPILOT && !util.hasRoles(req, [USER_ROLE.COPILOT])) {
        const err = new Error(`Only copilot is able to join as ${targetRole}`);
        err.status = 401;
        return next(err);
      }
    } else if (util.hasRoles(req, [USER_ROLE.MANAGER, USER_ROLE.CONNECT_ADMIN])) {
      targetRole = PROJECT_MEMBER_ROLE.MANAGER;
    } else if (util.hasRoles(req, [USER_ROLE.TOPCODER_ACCOUNT_MANAGER])) {
      targetRole = PROJECT_MEMBER_ROLE.ACCOUNT_MANAGER;
    } else if (util.hasRoles(req, [USER_ROLE.COPILOT, USER_ROLE.CONNECT_ADMIN])) {
      targetRole = PROJECT_MEMBER_ROLE.COPILOT;
    } else {
      const err = new Error('Only copilot or manager is able to call this endpoint');
      err.status = 401;
      return next(err);
    }

    const projectId = _.parseInt(req.params.projectId);

    const member = {
      projectId,
      role: targetRole,
      userId: req.authUser.userId,
      createdBy: req.authUser.userId,
      updatedBy: req.authUser.userId,
    };

    let promise = Promise.resolve();
    if (member.role === PROJECT_MEMBER_ROLE.MANAGER) {
      promise = util.getUserRoles(member.userId, req.log, req.id);
    }

    req.log.debug('creating member', member);
    return promise.then((memberRoles) => {
      req.log.debug(memberRoles);
      if (member.role === PROJECT_MEMBER_ROLE.MANAGER
        && (!memberRoles || !util.hasIntersection(MANAGER_ROLES, memberRoles))) {
        const err = new Error('This user can\'t be added as a Manager to the project');
        err.status = 400;
        return next(err);
      }

      return util.addUserToProject(req, member)
        .then((newMember) => {
          let invite;
          return models.ProjectMemberInvite.getPendingInviteByEmailOrUserId(projectId, null, newMember.userId)
            .then((_invite) => {
              invite = _invite;
              if (!invite) {
                // emit the event
                util.sendResourceToKafkaBus(
                  req,
                  EVENT.ROUTING_KEY.PROJECT_MEMBER_ADDED,
                  RESOURCES.PROJECT_MEMBER,
                  newMember);

                return res.status(201)
                  .json(newMember);
              }
              return invite.update({
                status: INVITE_STATUS.ACCEPTED,
              })
                .then(() => {
                  // emit the event
                  util.sendResourceToKafkaBus(
                    req,
                    EVENT.ROUTING_KEY.PROJECT_MEMBER_ADDED,
                    RESOURCES.PROJECT_MEMBER,
                    newMember);
                  return res.status(201).json(newMember);
                });
            });
        });
    })
      .catch(err => next(err));
  },
];
