

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
    const currentUserId = req.authUser.userId;
    const currentUserEmail = req.authUser.email ? req.authUser.email.toLowerCase() : req.authUser.email;
    const fields = req.query.fields ? req.query.fields.split(',') : null;
    const canReadAllInvites = util.hasPermissionByReq(PERMISSION.READ_PROJECT_INVITE_NOT_OWN, req);

    try {
      util.validateFields(fields, ALLOWED_FIELDS);
    } catch (validationError) {
      const err = new Error(`"fields" is not valid: ${validationError.message}`);
      err.status = 400;
      return next(err);
    }

    const invitesPromise = canReadAllInvites
      ? models.ProjectMemberInvite.getPendingOrRequestedProjectInvitesForUser(projectId)
      : models.ProjectMemberInvite.getPendingOrRequestedProjectInvitesForUser(
        projectId, currentUserEmail, currentUserId);

    return invitesPromise
      .then(invites => (
        util.getObjectsWithMemberDetails(invites, fields, req)
          .catch((err) => {
            req.log.error('Cannot get user details for invites.');
            req.log.debug('Error during getting user details for invites.', err);
            // continues without details anyway
            return invites;
          })
      ))
      .then(invites => res.json(util.postProcessInvites('$[*]', invites, req)))
      .catch(next);
  },
];
