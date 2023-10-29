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

const PROJECT_MEMBER_ATTRIBUTES = _.without(_.keys(models.ProjectMember.rawAttributes));

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
          inner_hits: {
            // TODO: replace this temporary fix with a better solution
            // we have to get all the members of the project,
            // should we just get a project object instead of creating such a detailed request?
            // I guess just retrieving project by id and after returning members from it
            // should work much faster
            size: 1000,
          },
        },
      },
    })
      .then((data) => {
        if (data.length === 0) {
          req.log.debug('No project members found in ES');
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
          });
        }
        req.log.debug('project members found in ES');
        return data[0].inner_hits.members.hits.hits.map(hit => _.pick(
          hit._source, // eslint-disable-line no-underscore-dangle
          // Elasticsearch index might have additional fields added to members like
          // 'handle', 'firstName', 'lastName', 'email'
          // but we shouldn't return them, as they might be outdated
          // method "getObjectsWithMemberDetails" would populate these fields again
          // with up to date data from Member Service if necessary
          PROJECT_MEMBER_ATTRIBUTES,
        ));
      })
      .then(members => (
        util.getObjectsWithMemberDetails(members, fields, req)
          .catch((err) => {
            req.log.error('Cannot get user details for member.');
            req.log.debug('Error during getting user details for member.', err);
            // continues without details anyway
            return members;
          })
      ))
      .then(members => res.json(members))
      .catch(next);
  },
];
