import _ from 'lodash';
import config from 'config';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import models from '../../models';
import util from '../../util';

/**
 * API to download a project attachment.
 *
 */

const permissions = tcMiddleware.permissions;

const getFileDownloadUrl = (req, filePath) => {
  if (process.env.NODE_ENV === 'development' || config.get('enableFileUpload') === false) {
    return ['', 'dummy://url'];
  }
  return util.getFileDownloadUrl(req, filePath);
};

module.exports = [
  permissions('project.downloadAttachment'),
  (req, res, next) => {
    const projectId = _.parseInt(req.params.projectId);
    const attachmentId = _.parseInt(req.params.id);

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
                    { term: { 'attachments.id': attachmentId } },
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
        return models.ProjectAttachment.findOne(
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
          if (process.env.NODE_ENV === 'development' && config.get('enableFileUpload') === 'false') {
            return ['dummy://url'];
          }

          return getFileDownloadUrl(req, attachment.filePath);
        })
        .catch((error) => {
          req.log.error('Error fetching attachment', error);
          const rerr = error;
          rerr.status = rerr.status || 500;
          next(rerr);
        });
      }
      req.log.debug('attachment found in ES');
      const attachment = data[0].inner_hits.attachments.hits.hits[0]._source; // eslint-disable-line no-underscore-dangle
      return getFileDownloadUrl(req, attachment.filePath);
    })
    .then((result) => {
      req.log.debug('getFileDownloadUrl result: ', JSON.stringify(result));
      const url = result[1];
      return res.json({ url });
    })
    .catch(next);
  },
];
