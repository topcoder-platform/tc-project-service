

import _ from 'lodash';
import Joi from 'joi';
import validate from 'express-validation';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import models from '../../models';
import util from '../../util';
import { PERMISSION } from '../../permissions/constants';

const ALLOWED_FIELDS = _.keys(models.ProjectMemberInvite.rawAttributes).concat(['handle']);

/**
 * API to update invite member to project.
 *
 */
const schema = {
  query: {
    fields: Joi.string().optional(),
  },
};

const permissions = tcMiddleware.permissions;

module.exports = [
  validate(schema),
  permissions('projectMemberInvite.view'),
  (req, res, next) => {
    const projectId = _.parseInt(req.params.projectId);
    const inviteId = _.parseInt(req.params.inviteId);
    const currentUserId = req.authUser.userId;
    const email = req.authUser.email ? req.authUser.email.toLowerCase() : req.authUser.email;
    const fields = req.query.fields ? req.query.fields.split(',') : null;
    const canReadAllInvites = util.hasPermissionByReq(PERMISSION.READ_PROJECT_INVITE_NOT_OWN, req);

    try {
      util.validateFields(fields, ALLOWED_FIELDS);
    } catch (validationError) {
      const err = new Error(`"fields" is not valid: ${validationError.message}`);
      err.status = 400;
      return next(err);
    }

    const invitePromise = canReadAllInvites
      ? models.ProjectMemberInvite.getPendingInviteByIdForUser(projectId, inviteId)
      : models.ProjectMemberInvite.getPendingInviteByIdForUser(projectId, inviteId, email, currentUserId);

    return invitePromise
      .then((invite) => {
        if (!invite) {
          let errMsg;
          if (canReadAllInvites) {
            errMsg = `invite not found for project id ${projectId}, inviteId ${inviteId}`;
          } else {
            errMsg = `invite not found for project id ${projectId}, inviteId ${inviteId}, ` +
              `userId ${currentUserId} and email ${email}`;
          }
          const err = new Error(errMsg);
          err.status = 404;
          throw err;
        }
        return invite;
      })
      .then(invite => (
        util.getObjectsWithMemberDetails([invite], fields, req)
          .then(([inviteWithDetails]) => inviteWithDetails)
          .catch((err) => {
            req.log.error('Cannot get user details for invite.');
            req.log.debug('Error during getting user details for invite.', err);
          // continues without details anyway
          return invite;
        })
    ))
      .then(invite => res.json(util.postProcessInvites('$.email', invite, req)))
      .catch(next);
  },
];
