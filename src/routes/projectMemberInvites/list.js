

import _ from 'lodash';
import Joi from 'joi';
import validate from 'express-validation';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import models from '../../models';
import util from '../../util';

const ALLOWED_FIELDS = _.keys(models.ProjectMemberInvite.rawAttributes).concat(['handle']);

/**
 * API to update invite member to project.
 *
 */
const schema = {
  query: {
    fields: Joi.string().optional(),
  },
};

const permissions = tcMiddleware.permissions;

module.exports = [
  validate(schema),
  permissions('projectMemberInvite.list'),
  (req, res, next) => {
    const projectId = _.parseInt(req.params.projectId);
    const currentUserId = req.authUser.userId;
    const email = req.authUser.email;
    const fields = req.query.fields ? req.query.fields.split(',') : null;

    const esSearchParam = {
      query: {
        nested: {
          path: 'invites',
          query:
          {
            filtered: {
              filter: {
                bool: {
                  must: [
                    { term: { 'invites.projectId': projectId } },
                  ],
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
    };

    if (req.context.inviteType === 'list') {
      // user has no "view" project permission
      // try to search from es, add search by user id or email
      esSearchParam.query.nested.query.filtered.filter.bool.must.push({
        bool: {
          should: [
            { term: { 'invites.email': email } },
            { term: { 'invites.userId': currentUserId } },
          ],
          minimum_number_should_match: 1,
        },
      });
    }

    try {
      util.validateFields(fields, ALLOWED_FIELDS);
    } catch (validationError) {
      const err = new Error(`"fields" is not valid: ${validationError.message}`);
      err.status = 400;
      return next(err);
    }

    return util.fetchByIdFromES('invites', esSearchParam)
      .then((data) => {
        if (data.length === 0) {
          req.log.debug('No project member invites found in ES');
          // if user has "view" project permission, get all invites
          if (req.context.inviteType === 'all') {
            return models.ProjectMemberInvite.getPendingOrRequestedProjectInvitesForUser(projectId);
          }
          // get invitation only for user
          return models.ProjectMemberInvite.getPendingOrRequestedProjectInvitesForUser(
            projectId, email, currentUserId);
        }
        req.log.debug('project member found in ES');
        return data[0].inner_hits.invites.hits.hits.map(hit => hit._source); // eslint-disable-line no-underscore-dangle
      }).then(invites => (
        util.getObjectsWithMemberDetails(invites, fields, req)
          .catch((err) => {
            req.log.error('Cannot get user details for invites.');
            req.log.debug('Error during getting user details for invites.', err);
            // continues without details anyway
            return invites;
          })
      ))
      .then(invites => res.json(util.maskInviteEmails('$[*].email', invites, req)))
      .catch(next);
  },
];
