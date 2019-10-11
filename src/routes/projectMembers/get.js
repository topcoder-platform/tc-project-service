

import _ from 'lodash';
import Joi from 'joi';
import validate from 'express-validation';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import models from '../../models';
import util from '../../util';

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
};

module.exports = [
  // handles request validations
  validate(schema),
  permissions('project.viewMember'),
  (req, res, next) => {
    const projectId = _.parseInt(req.params.projectId);
    const memberRecordId = _.parseInt(req.params.id);

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
                return next(err);
              }
              return res.json(member);
            })
          .catch(err => next(err));
      }
      req.log.debug('project member found in ES');
      return res.json(data[0].inner_hits.members.hits.hits[0]._source); // eslint-disable-line no-underscore-dangle
    })
    .catch(next);
  },
];
