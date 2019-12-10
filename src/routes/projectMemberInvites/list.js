import _ from 'lodash';
import Joi from 'joi';
import validate from 'express-validation';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import models from '../../models';
import util from '../../util';

/**
 * API to list all project member invites.
 *
 */
const permissions = tcMiddleware.permissions;

const schema = {
  query: {
    fields: Joi.string().optional(),
  },
};

module.exports = [
  validate(schema),
  permissions('projectMemberInvite.list'),
  async (req, res, next) => {
    try {
      let fields = null;
      if (req.query.fields) {
        fields = req.query.fields.split(',');
      }
      const projectId = _.parseInt(req.params.projectId);
      const invites = await models.ProjectMemberInvite.getPendingAndReguestedInvitesForProject(projectId);
      let invitesWithDetails;
      try {
        invitesWithDetails = await util.getObjectsWithMemberDetails(invites, fields, req);
      } catch (err) {
        invitesWithDetails = invites;
        req.log.error('Cannot get user details for invites.');
        req.log.debug('Error during getting user details for invites', err);
      }
      return res.json(util.wrapResponse(req.id, util.maskInviteEmails('$[*].email', invitesWithDetails, req)));
    } catch (err) {
      return next(err);
    }
  },
];
