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
      const memberFields = _.keys(models.ProjectMemberInvite.attributes);
      const projectId = _.parseInt(req.params.projectId);
      const invites = await models.ProjectMemberInvite.findAll({
        where: { projectId },
        raw: true,
      });
      const opts = {
        logger: req.log,
        requestId: req.id,
        memberFields,
      };
      const invitesWithDetails = await util.getObjectsWithMemberDetails(invites, fields, opts);
      return res.json(util.wrapResponse(req.id, invitesWithDetails));
    } catch (err) {
      return next(err);
    }
  },
];
