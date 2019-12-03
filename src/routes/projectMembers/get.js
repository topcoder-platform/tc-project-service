

import _ from 'lodash';
import Joi from 'joi';
import validate from 'express-validation';
import { middleware as tcMiddleware } from 'tc-core-library-js';
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
      const projectId = _.parseInt(req.params.projectId);
      let fields = null;
      if (req.query.fields) {
        fields = req.query.fields.split(',');
      }
      const memberId = _.parseInt(req.params.id);
      let member = _.find(req.context.currentProjectMembers, user => user.id === memberId);
      if (!member) {
        const err = new Error(
          `member not found for project id ${projectId}, userId ${memberId}`,
        );
        err.status = 404;
        throw err;
      }
      const memberDetails = await util.getObjectsWithMemberDetails([member], fields, req);
      member = _.first(memberDetails);
      return res.json(util.wrapResponse(req.id, member));
    } catch (err) {
      return next(err);
    }
  },
];
