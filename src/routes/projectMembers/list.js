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
    let fields = null;
    if (req.query.fields) {
      fields = req.query.fields.split(',');
    }
    try {
      const members = await util.getObjectsWithMemberDetails(req.context.currentProjectMembers, fields, req);
      return res.json(util.wrapResponse(req.id, members));
    } catch (err) {
      return next(err);
    }
  },
];
