/*
 * Copyright (C) 2016 TopCoder Inc., All Rights Reserved.
 */
/**
 * This is the middleware to check role.
 * @author TCDEVELOPER
 * @version 1.0
 */
import config from 'config';

const util = require('tc-core-library-js').util(config);

module.exports = function defineCheckRole(roleName) {
  return function checkRoleMiddleware(req, res, next) {
    if (!req.authUser || !Array.isArray(req.authUser.roles) ||
      req.authUser.roles.indexOf(roleName) === -1) {
      return res.status(403)
        .json(util.wrapErrorResponse(req.id, 403, 'You are not allowed to perform this action.'));
    }
    return next();
  };
};
