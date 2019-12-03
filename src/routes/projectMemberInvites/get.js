import _ from 'lodash';
import Joi from 'joi';
import validate from 'express-validation';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import models from '../../models';
import util from '../../util';

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
  permissions('projectMemberInvite.get'),
  async (req, res, next) => {
    try {
      const projectId = _.parseInt(req.params.projectId);
      const currentUserId = req.authUser.userId;
      const invite = await models.ProjectMemberInvite.getPendingInviteByEmailOrUserId(
        projectId, req.authUser.email, currentUserId,
      );
      if (!invite) {
        // check there is an existing invite for the user with status PENDING
        // handle 404
        const err = new Error(
          'invite not found for project id ' +
          `${projectId}, userId ${currentUserId}, email ${req.authUser.email}`,
        );
        err.status = 404;
        throw err;
      }

      let fields = null;
      if (req.query.fields) {
        fields = req.query.fields.split(',');
      }
      const [inviteWithDetails] = await util.getObjectsWithMemberDetails([invite], fields, req);

      return res.json(util.wrapResponse(req.id, inviteWithDetails));
    } catch (err) {
      return next(err);
    }
  },
];
