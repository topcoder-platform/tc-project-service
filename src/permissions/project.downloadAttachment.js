import _ from 'lodash';
import util from '../util';
import models from '../models';

/**
 * Connect admin and Topcoder admins are allowed to download any project attachments
 * Rest can update attachments that they created or given access
 * @param {Object}    freq        the express request instance
 * @return {Promise}              Returns a promise
 */
module.exports = freq => new Promise((resolve, reject) => {
  const projectId = _.parseInt(freq.params.projectId);
  const attachmentId = _.parseInt(freq.params.id);
  const userId = freq.authUser.userId;

  if (util.hasAdminRole(freq)) {
    return resolve(true);
  }
  return models.ProjectAttachment.getAttachmentById(projectId, attachmentId)
      .then((attachment) => {
        const req = freq;
        req.context = req.context || {};
        req.context.existingAttachment = attachment;

        // deligate not found to the actual handler
        if (!attachment) {
          return resolve(true);
        }

        if (attachment.createdBy === userId || attachment.allowedUsers === null ||
          attachment.allowedUsers.indexOf(userId) >= 0) {
          return resolve(true);
        }

        return reject(new Error('You\'re not allowed to download'));
      });
});
