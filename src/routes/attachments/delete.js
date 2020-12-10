

// import validate from 'express-validation'
import _ from 'lodash';
import {
  middleware as tcMiddleware,
} from 'tc-core-library-js';
import config from 'config';
import models from '../../models';
import util from '../../util';
import fileService from '../../services/fileService';
import { EVENT, RESOURCES, ATTACHMENT_TYPES } from '../../constants';

/**
 * API to delete a project member.
 *
 */

const permissions = tcMiddleware.permissions;

module.exports = [
  permissions('projectAttachment.delete'),
  (req, res, next) => {
    const projectId = _.parseInt(req.params.projectId);
    const attachmentId = _.parseInt(req.params.id);
    let attachment;
    models.sequelize.transaction(() =>
      // soft delete the record
      models.ProjectAttachment.findOne({
        where: {
          id: attachmentId,
          projectId,
        },
      })
        .then((_attachment) => {
          if (!_attachment) {
            const err = new Error('Record not found');
            err.status = 404;
            return Promise.reject(err);
          }
          attachment = _attachment;
          return _attachment.update({ deletedBy: req.authUser.userId })
            .then(() => _attachment.destroy());
        }))
      .then((_attachment) => {
        if (_attachment.type === ATTACHMENT_TYPES.FILE &&
             (process.env.NODE_ENV !== 'development' || config.get('enableFileUpload') === 'true')) {
          return fileService.deleteFile(req, _attachment.path);
        }
        return Promise.resolve();
      })
      .then(() => {
        // fire event
        const pattachment = attachment.get({ plain: true });
        // emit the event
        util.sendResourceToKafkaBus(
          req,
          EVENT.ROUTING_KEY.PROJECT_ATTACHMENT_REMOVED,
          RESOURCES.ATTACHMENT,
          pattachment);
        res.status(204).json({});
      })
      .catch(err => next(err));
  },
];
