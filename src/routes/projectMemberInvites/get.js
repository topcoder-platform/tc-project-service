

import _ from 'lodash';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import models from '../../models';
import util from '../../util';

/**
 * API to update invite member to project.
 *
 */
const permissions = tcMiddleware.permissions;

module.exports = [
  // handles request validations
  permissions('projectMemberInvite.get'),
  (req, res, next) => {
    const projectId = _.parseInt(req.params.projectId);
    const currentUserId = req.authUser.userId;
    const email = req.authUser.email;
    let invite;

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
            .then((_invite) => {
              invite = _invite;
              if (!invite) {
                    // check there is an existing invite for the user with status PENDING
                    // handle 404
                const err = new Error('invite not found for project id ' +
                            `${projectId}, userId ${currentUserId}, email ${email}`);
                err.status = 404;
                return next(err);
              }
              return res.json(invite);
            })
          .catch(err => next(err));
      }
      req.log.debug('project member found in ES');
      return res.json(data[0].inner_hits.invites.hits.hits[0]._source); // eslint-disable-line no-underscore-dangle
    })
    .catch(next);
  },
];
