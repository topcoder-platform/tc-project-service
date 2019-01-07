

import _ from 'lodash';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import models from '../../models';
import util from '../../util';

/**
 * API to update invite member to project.
 *
 */
const permissions = tcMiddleware.permissions;

module.exports = [
  // handles request validations
  permissions('projectMemberInvite.get'),
  (req, res, next) => {
    const projectId = _.parseInt(req.params.projectId);
    const currentUserId = req.authUser.userId;
    let invite;
    return models.ProjectMemberInvite.getPendingInviteByEmailOrUserId(projectId, req.authUser.email, currentUserId)
        .then((_invite) => {
          invite = _invite;
          if (!invite) {
                // check there is an existing invite for the user with status PENDING
                // handle 404
            const err = new Error('invite not found for project id ' +
                        `${projectId}, userId ${currentUserId}, email ${req.authUser.email}`);
            err.status = 404;
            return next(err);
          }
          return res.json(util.wrapResponse(req.id, invite));
        });
  },
];
