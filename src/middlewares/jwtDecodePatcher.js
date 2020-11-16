/*
 * Copyright (C) 2016 TopCoder Inc., All Rights Reserved.
 */
/**
 * This is the middleware to check role.
 * @author TCDEVELOPER
 * @version 1.0
 */
import _ from 'lodash';

module.exports = function patchAuthUser(logger) {
  return function patch(req, res, next) {
    if (req.authUser) {
      if (!req.authUser.email) {
        logger.debug(`Email not found for user with id ${req.authUser.userId}`);
        req.authUser.email = _.find(req.authUser, (value, key) => (key.indexOf('email') !== -1));
      }
    }
    return next();
  };
};
