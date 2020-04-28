import _ from 'lodash';
import Joi from 'joi';
import validate from 'express-validation';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import util from '../../util';
import models from '../../models';
import { PROJECT_TO_TOPCODER_ROLES_MATRIX, PERMISSION } from '../../permissions/constants';

/**
 * API to add a project member.
 * add members directly (only managers and copilots)
 * user being added is current user
 */
const permissions = tcMiddleware.permissions;

const createProjectMemberValidations = {
  body: Joi.object().keys({
    userId: Joi.number().optional(),
    role: Joi.string().valid(_.keys(PROJECT_TO_TOPCODER_ROLES_MATRIX)),
  }),
};

module.exports = [
  // handles request validations
  validate(createProjectMemberValidations),
  permissions('projectMember.create'),
  async (req, res, next) => {
    try {
      // by default, we would add the current user as a member
      let addUserId = req.authUser.userId;
      let addUser = req.authUser;

      // if `userId` is provided in the request body then we should add this user as a member
      if (_.get(req, 'body.userId') && _.get(req, 'body.userId') !== req.authUser.userId) {
        addUserId = _.get(req, 'body.userId');

        // check if current user has permissions to add other users
        if (!util.hasPermissionByReq(PERMISSION.CREATE_PROJECT_MEMBER_NOT_OWN, req)) {
          const err = new Error('You don\'t have permissions to add other users as a project member.');
          err.status = 403;
          throw err;
        }

        // if we are adding another user, we have to get that user roles for checking permissions
        try {
          const addUserRoles = await util.getUserRoles(addUserId, req.log, req.id);
          addUser = {
            roles: addUserRoles,
          };
        } catch (e) {
          throw new Error(`Cannot get user roles: "${e.message}".`);
        }
      }

      const targetRole = _.get(req, 'body.role', util.getDefaultProjectRole(addUser));

      if (!targetRole) {
        throw new Error('Cannot automatically detect role for a new member.');
      }

      if (!util.matchPermissionRule({ topcoderRoles: PROJECT_TO_TOPCODER_ROLES_MATRIX[targetRole] }, addUser)) {
        const err = new Error(`User doesn't have required roles to be added to the project as "${targetRole}".`);
        err.status = 401;
        throw err;
      }

      const projectId = req.params.projectId;

      const member = {
        projectId,
        role: targetRole,
        userId: addUserId,
        createdBy: req.authUser.userId,
        updatedBy: req.authUser.userId,
      };

      let newMember;
      await models.sequelize.transaction(async (transaction) => {
        // Kafka event is emitted inside `addUserToProject`
        newMember = await util.addUserToProject(req, member, transaction);
      });

      return res.status(201).json(newMember);
    } catch (err) {
      return next(err);
    }
  },
];
