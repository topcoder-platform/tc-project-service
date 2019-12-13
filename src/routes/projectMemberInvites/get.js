

import _ from 'lodash';
import Joi from 'joi';
import validate from 'express-validation';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import models from '../../models';
import util from '../../util';

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
  permissions('projectMemberInvite.get'),
  (req, res, next) => {
    const projectId = _.parseInt(req.params.projectId);
    const currentUserId = req.authUser.userId;
    const email = req.authUser.email;
    const fields = req.query.fields ? req.query.fields.split(',') : null;

    util.fetchByIdFromES('invites', {
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
                    {
                      bool: {
                        should: [
                                { term: { 'invites.email': email } },
                                { term: { 'invites.userId': currentUserId } },
                        ],
                        minimum_number_should_match: 1,
                      },
                    },

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
        req.log.debug('No project member invite found in ES');
        return models.ProjectMemberInvite.getPendingInviteByEmailOrUserId(projectId, email, currentUserId)
          .then((invite) => {
            if (!invite) {
                  // check there is an existing invite for the user with status PENDING
                  // handle 404
              const err = new Error('invite not found for project id ' +
                          `${projectId}, userId ${currentUserId}, email ${email}`);
              err.status = 404;
              throw err;
            }
            return invite;
          });
      }
      req.log.debug('project member found in ES');
      return data[0].inner_hits.invites.hits.hits[0]._source; // eslint-disable-line no-underscore-dangle
    }).then(invite => (
      util.getObjectsWithMemberDetails([invite], fields, req)
        .then(([inviteWithDetails]) => inviteWithDetails)
        .catch((err) => {
          req.log.error('Cannot get user details for invite.');
          req.log.debug('Error during getting user details for invite.', err);
        })
    ))
    .then(invite => res.json(util.maskInviteEmails('$[*].email', invite, req)))
    .catch(next);
  },
];
