

import _ from 'lodash';
import Joi from 'joi';
import validate from 'express-validation';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import models from '../../models';
import util from '../../util';

/**
 * API to get a project member in a project.
 */
const permissions = tcMiddleware.permissions;

const schema = {
  query: {
    fields: Joi.string().optional(),
  },
};

module.exports = [
  validate(schema),
  permissions('project.getMember'),
  async (req, res, next) => {
    try {
      let fields = null;
      if (req.query.fields) {
        fields = req.query.fields.split(',');
      }
      const memberFields = _.keys(models.ProjectMember.attributes);
      const memberId = _.parseInt(req.params.id);
      const members = [_.find(req.context.currentProjectMembers, user => user.id === memberId)];
      const [member] = await util.getObjectsWithMemberDetails(
        members, fields, {
          logger: req.log,
          requestId: req.id,
          memberFields,
        },
      );
      return res.json(util.wrapResponse(req.id, member));
    } catch (err) {
      return next(err);
    }
  },
];
