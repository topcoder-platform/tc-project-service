

import _ from 'lodash';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import util from '../../util';
import { USER_ROLE, PROJECT_MEMBER_ROLE, MANAGER_ROLES, INVITE_STATUS } from '../../constants';
import models from '../../models';

/**
 * API to add a project member.
 * add members directly (only managers and copilots)
 * user being added is current user
 */
const permissions = tcMiddleware.permissions;

module.exports = [
  // handles request validations
  permissions('project.addMember'),
  (req, res, next) => {
    let targetRole;
    if (util.hasRoles(req, [USER_ROLE.MANAGER])) {
      targetRole = PROJECT_MEMBER_ROLE.MANAGER;
    } else if (util.hasRoles(req, [USER_ROLE.COPILOT])) {
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
                return res.status(201).json(util.wrapResponse(req.id, newMember, 1, 201));
              }
              return invite.update({
                status: INVITE_STATUS.ACCEPTED,
              }).then(() => res.status(201).json(util.wrapResponse(req.id, newMember, 1, 201)));
            });
        });
    }).catch(err => next(err));
  },
];
