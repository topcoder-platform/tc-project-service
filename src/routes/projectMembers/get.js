

import _ from 'lodash';
import Joi from 'joi';
import validate from 'express-validation';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import models from '../../models';
import util from '../../util';

const PROJECT_MEMBER_ATTRIBUTES = _.union(
  _.without(_.keys(models.ProjectMember.rawAttributes), 'deletedAt', 'deletedBy'),
  ['projectId'],
);

/**
 * API to get project member.
 *
 */
const permissions = tcMiddleware.permissions;

const schema = {
  params: {
    projectId: Joi.number().integer().positive().required(),
    id: Joi.number().integer().positive().required(),
  },
  query: {
    fields: Joi.string().optional(),
  },
};

module.exports = [
  // handles request validations
  validate(schema),
  permissions('projectMember.view'),
  (req, res, next) => {
    const projectId = _.parseInt(req.params.projectId);
    const memberRecordId = _.parseInt(req.params.id);
    const fields = req.query.fields ? req.query.fields.split(',') : [];

    return models.ProjectMember.findOne({
      where: {
        id: memberRecordId,
        projectId,
      },
      attributes: { exclude: ['deletedAt', 'deletedBy'] },
      raw: true,
    })
      .then((member) => {
        if (!member) {
          const err = new Error(`member not found for project id ${projectId}, id ${memberRecordId}`);
          err.status = 404;
          throw err;
        }
        return _.pick(member, PROJECT_MEMBER_ATTRIBUTES);
      })
      .then((member) => {
        if (!fields.length) {
          return member;
        }
        return util.getObjectsWithMemberDetails([member], fields, req)
          .then(([memberWithDetails]) => _.assign({}, member, memberWithDetails || {}))
          .catch((err) => {
            req.log.error('Cannot get user details for member.');
            req.log.debug('Error during getting user details for member.', err);
            // continues without details anyway
            return member;
          });
      })
      .then(member => res.json(member))
      .catch(next);
  },
];
