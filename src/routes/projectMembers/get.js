

import _ from 'lodash';
import Joi from 'joi';
import validate from 'express-validation';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import models from '../../models';
import util from '../../util';

const PROJECT_MEMBER_ATTRIBUTES = _.without(_.keys(models.ProjectMember.rawAttributes));

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

    util.fetchByIdFromES('members', {
      query: {
        nested: {
          path: 'members',
          query:
          {
            filtered: {
              filter: {
                bool: {
                  must: [
                    { term: { 'members.projectId': projectId } },
                    { term: { 'members.id': memberRecordId } },
                  ],
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
          return models.ProjectMember.findOne({
            where: {
              id: memberRecordId,
              projectId },
            attributes: { exclude: ['deletedAt', 'deletedBy'] },
            raw: true,
          })
            .then((member) => {
              if (!member) {
                // check there is an existing member
                const err = new Error(`member not found for project id ${projectId}, id ${memberRecordId}`);
                err.status = 404;
                throw err;
              }
              return member;
            });
        }
        req.log.debug('project member found in ES');
        return _.pick(
          data[0].inner_hits.members.hits.hits[0]._source, // eslint-disable-line no-underscore-dangle
          // Elasticsearch index might have additional fields added to members like
          // 'handle', 'firstName', 'lastName', 'email'
          // but we shouldn't return them, as they might be outdated
          // method "getObjectsWithMemberDetails" would populate these fields again
          // with up to date data from Member Service if necessary
          PROJECT_MEMBER_ATTRIBUTES,
        );
      }).then(member => (
        util.getObjectsWithMemberDetails([member], fields, req)
          .then(([memberWithDetails]) => memberWithDetails)
          .catch((err) => {
            req.log.error('Cannot get user details for member.');
            req.log.debug('Error during getting user details for member.', err);
            // continues without details anyway
            return member;
          })
      ))
      .then(member => res.json(member))
      .catch(next);
  },
];
