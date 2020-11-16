/*
 * Copyright (C) 2016 TopCoder Inc., All Rights Reserved.
 */
/**
 * This is the middleware to check role.
 * @author TCDEVELOPER
 * @version 1.0
 */
import _ from 'lodash';

module.exports = function patchAuthUser(roleName) {
  return function patch(req, res, next) {
    if (req.authUser) {
      if (!req.authUser.email) {
        req.authUser.email = _.find(req.authUser, (value, key) => {
          return (key.indexOf('email') !== -1)
        })
      }
    }
    return next();
  };
};
