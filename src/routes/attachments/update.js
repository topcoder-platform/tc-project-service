
import validate from 'express-validation';
import _ from 'lodash';
import Joi from 'joi';
import {
  middleware as tcMiddleware,
} from 'tc-core-library-js';
import models from '../../models';
import util from '../../util';
import { EVENT, RESOURCES } from '../../constants';
import { PERMISSION } from '../../permissions/constants';

/**
 * API to update a project member.
 */
const permissions = tcMiddleware.permissions;

const updateProjectAttachmentValidation = {
  body: Joi.object().keys({
    title: Joi.string().required(),
    description: Joi.string().optional().allow(null).allow(''),
    allowedUsers: Joi.array().items(Joi.number().integer().positive()).allow(null).default(null),
    tags: Joi.array().items(Joi.string().min(1)).optional(),
    path: Joi.string(),
  }),
};

module.exports = [
  // handles request validations
  validate(updateProjectAttachmentValidation),
  permissions('projectAttachment.edit'),
  /*
   * Update a attachment if the user has access
   */
  (req, res, next) => {
    const updatedProps = req.body;
    const projectId = _.parseInt(req.params.projectId);
    const attachmentId = _.parseInt(req.params.id);
    let previousValue;
    updatedProps.updatedBy = req.authUser.userId;
    models.sequelize.transaction(() => models.ProjectAttachment.findOne({
      where: {
        id: attachmentId,
        projectId,
      },
    }).then(existing => new Promise((accept, reject) => {
      if (!existing) {
        // handle 404
        const err = new Error('project attachment not found for project id ' +
              `${projectId} and member id ${attachmentId}`);
        err.status = 404;
        return reject(err);
      }
      previousValue = _.cloneDeep(existing.get({ plain: true }));

      if (
        previousValue.createdBy !== req.authUser.userId &&
        !util.hasPermissionByReq(PERMISSION.UPDATE_PROJECT_ATTACHMENT_NOT_OWN, req)
      ) {
        const err = new Error('You don\'t have permission to update attachment created by another user.');
        err.status = 403;
        return reject(err);
      }

      _.extend(existing, updatedProps);
      return existing.save().then(accept).catch(reject);
    })).then((updated) => {
      req.log.debug('updated project attachment', JSON.stringify(updated, null, 2));
      res.json(updated);

      // emit the event
      util.sendResourceToKafkaBus(
        req,
        EVENT.ROUTING_KEY.PROJECT_ATTACHMENT_UPDATED,
        RESOURCES.ATTACHMENT,
        updated.toJSON());
    }).catch(err => next(err)));
  },
];
