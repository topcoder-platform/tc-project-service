import _ from 'lodash';
import util from '../util';
import models from '../models';

/**
 * Connect admin and Topcoder admins are allowed to update any project attachments
 * Rest can update attachments that they created
 * @param {Object}    freq        the express request instance
 * @return {Promise}              Returns a promise
 */
module.exports = freq => new Promise((resolve, reject) => {
  const projectId = _.parseInt(freq.params.projectId);
  const attachmentId = _.parseInt(freq.params.id);

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

        if (attachment.createdBy === req.authUser.userId) {
          return resolve(true);
        }

        return reject(new Error('Only admins and the user that uploaded the docs can modify'));
      });
});
