import _ from 'lodash';
import Joi from 'joi';
import validate from 'express-validation';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import util from '../../util';
import { INVITE_STATUS, MANAGER_ROLES, PROJECT_MEMBER_ROLE, USER_ROLE } from '../../constants';
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
      .valid(
        PROJECT_MEMBER_ROLE.MANAGER,
        PROJECT_MEMBER_ROLE.ACCOUNT_MANAGER,
        PROJECT_MEMBER_ROLE.COPILOT,
        PROJECT_MEMBER_ROLE.PROJECT_MANAGER,
        PROJECT_MEMBER_ROLE.PROGRAM_MANAGER,
        PROJECT_MEMBER_ROLE.SOLUTION_ARCHITECT,
        PROJECT_MEMBER_ROLE.ACCOUNT_EXECUTIVE,
    ),
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

      if (PROJECT_MEMBER_ROLE.SOLUTION_ARCHITECT === targetRole &&
          !util.hasRoles(req, [USER_ROLE.SOLUTION_ARCHITECT])) {
        const err = new Error(`Only solution architect is able to join as ${targetRole}`);
        err.status = 401;
        return next(err);
      }

      if (PROJECT_MEMBER_ROLE.PROJECT_MANAGER === targetRole &&
          !util.hasRoles(req, [USER_ROLE.PROJECT_MANAGER])) {
        const err = new Error(`Only project manager is able to join as ${targetRole}`);
        err.status = 401;
        return next(err);
      }

      if (PROJECT_MEMBER_ROLE.PROGRAM_MANAGER === targetRole &&
          !util.hasRoles(req, [USER_ROLE.PROGRAM_MANAGER])) {
        const err = new Error(`Only program manager is able to join as ${targetRole}`);
        err.status = 401;
        return next(err);
      }

      if (PROJECT_MEMBER_ROLE.ACCOUNT_EXECUTIVE === targetRole &&
          !util.hasRoles(req, [USER_ROLE.ACCOUNT_EXECUTIVE])) {
        const err = new Error(`Only account executive is able to join as ${targetRole}`);
        err.status = 401;
        return next(err);
      }

      if (PROJECT_MEMBER_ROLE.ACCOUNT_MANAGER === targetRole &&
        !util.hasRoles(req, [
          USER_ROLE.MANAGER,
          USER_ROLE.TOPCODER_ACCOUNT_MANAGER,
          USER_ROLE.BUSINESS_DEVELOPMENT_REPRESENTATIVE,
          USER_ROLE.PRESALES,
          USER_ROLE.ACCOUNT_EXECUTIVE,
          USER_ROLE.PROGRAM_MANAGER,
          USER_ROLE.SOLUTION_ARCHITECT,
          USER_ROLE.PROJECT_MANAGER,
        ])) {
        const err = new Error(
            // eslint-disable-next-line max-len
            `Only manager, account manager, business development representative, account executive, program manager, project manager, solution architect, or presales are able to join as ${targetRole}`,
        );
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
    } else if (util.hasRoles(req, [
      USER_ROLE.TOPCODER_ACCOUNT_MANAGER,
      USER_ROLE.BUSINESS_DEVELOPMENT_REPRESENTATIVE,
      USER_ROLE.PRESALES,
    ])) {
      targetRole = PROJECT_MEMBER_ROLE.ACCOUNT_MANAGER;
    } else if (util.hasRoles(req, [USER_ROLE.COPILOT, USER_ROLE.CONNECT_ADMIN])) {
      targetRole = PROJECT_MEMBER_ROLE.COPILOT;
    } else if (util.hasRoles(req, [USER_ROLE.ACCOUNT_EXECUTIVE])) {
      targetRole = PROJECT_MEMBER_ROLE.ACCOUNT_EXECUTIVE;
    } else if (util.hasRoles(req, [USER_ROLE.PROGRAM_MANAGER])) {
      targetRole = PROJECT_MEMBER_ROLE.PROGRAM_MANAGER;
    } else if (util.hasRoles(req, [USER_ROLE.SOLUTION_ARCHITECT])) {
      targetRole = PROJECT_MEMBER_ROLE.SOLUTION_ARCHITECT;
    } else if (util.hasRoles(req, [USER_ROLE.PROJECT_MANAGER])) {
      targetRole = PROJECT_MEMBER_ROLE.PROJECT_MANAGER;
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

      return util.addUserToProject(req, member) // Kafka event is emitted inside `addUserToProject`
        .then(newMember =>
          models.ProjectMemberInvite.getPendingInviteByEmailOrUserId(projectId, null, newMember.userId)
            .then((invite) => {
              if (!invite) {
                return res.status(201).json(newMember);
              }
              return invite.update({
                status: INVITE_STATUS.ACCEPTED,
              })
                .then(() => res.status(201).json(newMember));
            }),
        );
    })
      .catch(err => next(err));
  },
];
