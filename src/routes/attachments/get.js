import _ from 'lodash';
import config from 'config';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import models from '../../models';
import util from '../../util';
import { ATTACHMENT_TYPES } from '../../constants';

/**
 * API to get a project attachment.
 */

const permissions = tcMiddleware.permissions;

/**
 * This private function gets the pre-signed url if the attachment is a file
 *
 * @param {Object} req The http request
 * @param {Object} attachment The project attachment object
 * @returns {Array<Promise>} The array of two promises, first one if the attachment object promise,
 *                           The second promise is for the file pre-signed url (if attachment type is file)
 */
const getPreSignedUrl = (req, attachment) => {
  if (attachment.type === ATTACHMENT_TYPES.LINK) {
    // If the attachment is a link return it as-is without getting the pre-signed url
    return [attachment, ''];
  }  // The attachment is a file
    // In development/test mode, if file upload is disabled, we return the dummy attachment object
  if (_.includes(['development', 'test'], process.env.NODE_ENV) && config.get('enableFileUpload') === 'false') {
    return [attachment, 'dummy://url'];
  }
      // Not in development mode or file upload is not disabled
  return [attachment, util.getFileDownloadUrl(req, attachment.path)];
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
          return getPreSignedUrl(req, attachment);
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

      return getPreSignedUrl(req, attachment);
    })
    .then((result) => {
      req.log.debug('getPresigned url result: ', JSON.stringify(result));
      if (_.isEmpty(result[1])) {
        return res.json(result[0]);
      }

      return res.json(_.extend(result[0], { url: result[1] }));
    })
    .catch(next);
  },
];
