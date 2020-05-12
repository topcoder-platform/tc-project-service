import _ from 'lodash';
import config from 'config';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import models from '../../models';
import util from '../../util';
import { ATTACHMENT_TYPES } from '../../constants';
import permissionUtils from '../../utils/permissions';

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
const getPreSignedUrl = async (req, attachment) => {
  // If the attachment is a link return it as-is without getting the pre-signed url
  if (attachment.type === ATTACHMENT_TYPES.LINK) {
    return [attachment, ''];
  }

  // The attachment is a file
  // In development mode, if file upload is disabled, we return the dummy attachment object
  if (_.includes(['development'], process.env.NODE_ENV) && config.get('enableFileUpload') === 'false') {
    return [attachment, 'dummy://url'];
  }
  // Not in development mode or file upload is not disabled
  const url = await util.getFileDownloadUrl(req, attachment.path);
  return [attachment, url];
};

module.exports = [
  permissions('projectAttachment.view'),
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
            .catch((error) => {
              req.log.error('Error fetching attachment', error);
              const rerr = error;
              rerr.status = rerr.status || 500;
              next(rerr);
            });
        }
        req.log.debug('attachment found in ES');
        return data[0].inner_hits.attachments.hits.hits[0]._source; // eslint-disable-line no-underscore-dangle
      })
      // check permissions
      .then((attachment) => {
        // if don't have permissions we would return 404 below as users shouldn't even know if attachment exists
        if (!permissionUtils.hasReadAccessToAttachment(attachment, req)) {
          return null;
        }

        return attachment;
      })
      .then((attachment) => {
        if (!attachment) {
          const err = new Error('Record not found');
          err.status = 404;
          return Promise.reject(err);
        }
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
