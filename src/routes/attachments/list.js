import _ from 'lodash';
import validate from 'express-validation';
import Joi from 'joi';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import models from '../../models';
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

    return models.ProjectAttachment.findAll({
      where: {
        projectId,
      },
      order: [
        ['id', 'ASC'],
      ],
      attributes: { exclude: ['deletedAt', 'deletedBy'] },
      raw: true,
    })
      // filter out attachments which user cannot see
      .then(attachments => attachments.filter(attachment =>
        permissionUtils.hasReadAccessToAttachment(attachment, req),
      ))
      .then(attachments => res.json(attachments))
      .catch(next);
  },
];
