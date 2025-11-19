/**
 * API to list all project members
 */
import _ from 'lodash';
import validate from 'express-validation';
import Joi from 'joi';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import models from '../../models';
import util from '../../util';
import { PROJECT_MEMBER_ROLE } from '../../constants';

const PROJECT_MEMBER_ATTRIBUTES = _.union(
  _.without(_.keys(models.ProjectMember.rawAttributes), 'deletedAt', 'deletedBy'),
  ['projectId'],
);

const permissions = tcMiddleware.permissions;

const schema = {
  query: {
    role: Joi.any()
      .valid(PROJECT_MEMBER_ROLE.MANAGER,
        PROJECT_MEMBER_ROLE.ACCOUNT_MANAGER,
        PROJECT_MEMBER_ROLE.COPILOT,
        PROJECT_MEMBER_ROLE.CUSTOMER,
        PROJECT_MEMBER_ROLE.OBSERVER),
    fields: Joi.string().optional(),
  },
  params: {
    projectId: Joi.number().integer().positive().required(),
  },
};

module.exports = [
  validate(schema),
  permissions('projectMember.view'),
  (req, res, next) => {
    const projectId = _.parseInt(req.params.projectId);
    const fields = req.query.fields ? req.query.fields.split(',') : [];
    const where = {
      projectId,
    };
    if (req.query.role) {
      where.role = req.query.role;
    }

    return models.ProjectMember.findAll({
      where,
      order: [
        ['id', 'ASC'],
      ],
      attributes: { exclude: ['deletedAt', 'deletedBy'] },
      raw: true,
    })
      .then((members) => {
        const baseMembers = members.map(member => _.pick(member, PROJECT_MEMBER_ATTRIBUTES));
        if (!fields.length) {
          return baseMembers;
        }
        return util.getObjectsWithMemberDetails(baseMembers, fields, req)
          .then((memberDetails) => {
            if (!memberDetails) {
              return baseMembers;
            }
            return baseMembers.map((member, index) =>
              _.assign({}, member, memberDetails[index] || {}));
          })
          .catch((err) => {
            req.log.error('Cannot get user details for member.');
            req.log.debug('Error during getting user details for member.', err);
            // continues without details anyway
            return baseMembers;
          });
      })
      .then(members => res.json(members))
      .catch(next);
  },
];
