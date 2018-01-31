
import _ from 'lodash';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import models from '../../models';
import util from '../../util';

/**
 * API to download a project attachment.
 *
 */

const permissions = tcMiddleware.permissions;

module.exports = [
  permissions('project.downloadAttachment'),
  (req, res, next) => {
    const projectId = _.parseInt(req.params.projectId);
    const attachmentId = _.parseInt(req.params.id);

    models.ProjectAttachment.findOne(
      {
        where: {
          id: attachmentId,
          projectId,
        },
      })
    .then((attachment) => {
      if (!attachment) {
        const err = new Error('Record not found');
        err.status = 404;
        return Promise.reject(err);
      }
      return util.getFileDownloadUrl(req, attachment.filePath);
    })
    .then((result) => {
      const url = result[1];
      res.status(200).json(util.wrapResponse(req.id, { url }));
    })
    .catch((error) => {
      req.log.error('Error fetching attachment', error);
      const rerr = error;
      rerr.status = rerr.status || 500;
      next(rerr);
    });
  },
];
