import Joi from 'joi';
import validate from 'express-validation';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import util from '../../util';

/**
 * API to list all project members.
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
  permissions('project.listMembers'),
  async (req, res, next) => {
    try {
      let fields = null;
      if (req.query.fields) {
        fields = req.query.fields.split(',');
      }

      let membersWithDetails;
      try {
        membersWithDetails = await util.getObjectsWithMemberDetails(req.context.currentProjectMembers, fields, req);
      } catch (err) {
        membersWithDetails = req.context.currentProjectMembers;
        req.log.error('Cannot get user details for the members.');
        req.log.debug('Error during getting user details for the members', err);
      }

      return res.json(util.wrapResponse(req.id, membersWithDetails));
    } catch (err) {
      return next(err);
    }
  },
];
