import _ from 'lodash';
import validate from 'express-validation';
import Joi from 'joi';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import models from '../../models';
import util from '../../util';
import permissionUtils from '../../utils/permissions';

/**
 * API to get project attachments.
 *
 */

const permissions = tcMiddleware.permissions;

const schema = {
  params: {
    projectId: Joi.number().integer().positive().required(),
  },
};

module.exports = [
  validate(schema),
  permissions('projectAttachment.view'),
  (req, res, next) => {
    const projectId = _.parseInt(req.params.projectId);

    util.fetchByIdFromES('attachments', {
      query: {
        nested: {
          path: 'attachments',
          query:
          {
            filtered: {
              filter: {
                bool: {
                  must: [
                    { term: { 'attachments.projectId': projectId } },
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
          req.log.debug('No attachment found in ES');
          return models.ProjectAttachment.findAll({
            where: {
              projectId,
            },
            attributes: { exclude: ['deletedAt', 'deletedBy'] },
            raw: true,
          })
            .catch(next);
        }
        req.log.debug('attachments found in ES');
        return data[0].inner_hits.attachments.hits.hits.map(hit => hit._source); // eslint-disable-line no-underscore-dangle
      })
      // filter out attachments which user cannot see
      .then(attachments => attachments.filter(attachment =>
        permissionUtils.hasReadAccessToAttachment(attachment, req),
      ))
      .then(attachments => res.json(attachments))
      .catch(next);
  },
];
