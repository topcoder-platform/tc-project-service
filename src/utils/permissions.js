/**
 * Helper methods related to checking permissions
 */
import _ from 'lodash';
import util from '../util';
import { PERMISSION } from '../permissions/constants';

const permissionUtils = {
  /**
   * Check if request from the user has permission to READ attachment
   *
   * @param {Object}          attachment attachment
   * @param {express.Request} req        request
   *
   * @returns {Boolean} true if has permission
   */
  hasReadAccessToAttachment: (attachment, req) => {
    if (!attachment) {
      return false;
    }

    const isOwnAttachment = attachment.createdBy === req.authUser.userId;
    const isAllowedAttachment = attachment.allowedUsers === null ||
      _.includes(attachment.allowedUsers, req.authUser.userId);

    if (
      util.hasPermissionByReq(PERMISSION.READ_PROJECT_ATTACHMENT_OWN_OR_ALLOWED, req) && (
        isOwnAttachment || isAllowedAttachment
      )
    ) {
      return true;
    }

    if (
      util.hasPermissionByReq(PERMISSION.READ_PROJECT_ATTACHMENT_NOT_OWN_AND_NOT_ALLOWED, req) &&
      !isOwnAttachment && !isAllowedAttachment
    ) {
      return true;
    }

    return false;
  },
};

export default permissionUtils;
