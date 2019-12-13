

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
  permissions('projectMemberInvite.list'),
  (req, res, next) => {
    const projectId = _.parseInt(req.params.projectId);
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
        req.log.debug('No project member invites found in ES');
        return models.ProjectMemberInvite.getPendingAndReguestedInvitesForProject(projectId);
      }
      req.log.debug('project member found in ES');
      return data[0].inner_hits.invites.hits.hits.map(hit => hit._source); // eslint-disable-line no-underscore-dangle
    }).then(invites => (
      util.getObjectsWithMemberDetails(invites, fields, req)
        .catch((err) => {
          req.log.error('Cannot get user details for invites.');
          req.log.debug('Error during getting user details for invites.', err);
        })
    ))
    .then(invites => res.json(util.maskInviteEmails('$[*].email', invites, req)))
    .catch(next);
  },
];
