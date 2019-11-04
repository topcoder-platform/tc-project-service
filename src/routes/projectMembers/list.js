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

const permissions = tcMiddleware.permissions;

const schema = {
  query: {
    role: Joi.any()
          .valid(PROJECT_MEMBER_ROLE.MANAGER,
            PROJECT_MEMBER_ROLE.ACCOUNT_MANAGER,
            PROJECT_MEMBER_ROLE.COPILOT,
            PROJECT_MEMBER_ROLE.CUSTOMER,
            PROJECT_MEMBER_ROLE.OBSERVER),
  },
  params: {
    projectId: Joi.number().integer().positive().required(),
  },
};

module.exports = [
  validate(schema),
  permissions('project.viewMember'),
  (req, res, next) => {
    const projectId = _.parseInt(req.params.projectId);
    const must = [
      { term: { 'members.projectId': projectId } },
    ];

    if (req.query.role) {
      must.push({ term: { 'members.role': req.query.role } });
    }

    util.fetchByIdFromES('members', {
      sort: [
        { id: { order: 'asc' } },
      ],
      query: {
        nested: {
          path: 'members',
          query:
          {
            filtered: {
              filter: {
                bool: {
                  must,
                },
              },
            },
          },
          inner_hits: {},
        },
      },
    })
    .then((data) => {
      if (data.length === 0) {
        req.log.debug('No project member found in ES');
          // Get all project members
        const where = {
          projectId,
        };
        if (req.query.role) {
          where.role = req.query.role;
        }
        return models.ProjectMember.findAll({
          where,
          // Add order
          order: [
              ['id', 'ASC'],
          ],
          attributes: { exclude: ['deletedAt', 'deletedBy'] },
          raw: true,
        })
          .then(members => res.json(members))
          .catch(next);
      }
      req.log.debug('project member found in ES');
      return res.json(data[0].inner_hits.members.hits.hits.map(hit => hit._source)); // eslint-disable-line no-underscore-dangle
    })
    .catch(next);
  },
];
