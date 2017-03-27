

// import validate from 'express-validation'
import _ from 'lodash';
import {
  middleware as tcMiddleware,
} from 'tc-core-library-js';
import models from '../../models';
import fileService from '../../services/fileService';
import { EVENT } from '../../constants';

/**
 * API to delete a project member.
 *
 */

const permissions = tcMiddleware.permissions;

module.exports = [
  permissions('project.removeAttachment'),
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
          return _attachment.destroy();
        })
        .then((_attachment) => {
          if (process.env.NODE_ENV !== 'development') {
            return fileService.deleteFile(req, _attachment.filePath);
          }
          return Promise.resolve();
        })
        .then(() => {
          // fire event
          const pattachment = attachment.get({ plain: true });
          req.app.services.pubsub.publish(
            EVENT.ROUTING_KEY.PROJECT_ATTACHMENT_REMOVED,
            pattachment,
            { correlationId: req.id },
          );
          req.app.emit(EVENT.ROUTING_KEY.PROJECT_ATTACHMENT_REMOVED, { req, pattachment });
          res.status(204).json({});
        })
        .catch(err => next(err)));
  },
];
