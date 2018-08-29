/**
 * The userId authentication middleware.
 */
import config from 'config';
import _ from 'lodash';
import util from '../util';

const whitelistedOrigins = JSON.parse(config.get('whitelistedOriginsForUserIdAuth'));

/**
 * The userId authentication middleware.
 * @param {Object} req the request
 * @param {Object} res the response
 * @param {Function} next the next middleware
 * @returns {Promise<void>} void
 */
module.exports = function userIdAuth(req, res, next) { // eslint-disable-line consistent-return
  req.log.debug('Enter userIdAuth middleware');

  const bearerUserId = 'Bearer userId_';

  if (!req.headers.authorization ||
    !req.headers.authorization.startsWith(bearerUserId) ||
    req.headers.authorization.length === bearerUserId.length) {
    res.status(403)
      .json(util.wrapErrorResponse(req.id, 403, 'No userId provided.'));
    return res.send();
  }

  // Check origin
  const origin = req.header('Origin') || ' ';
  if (!_.some(whitelistedOrigins, whitelistedOrigin => origin.startsWith(whitelistedOrigin))) {
    res.status(403).json(
      util.wrapErrorResponse(req.id, 403, `Origin ${origin} is not allowed to access this authentication scheme`));
    return res.end();
  }

  const userId = req.headers.authorization.split(bearerUserId)[1];

  req.log.debug('Get m2m token');
  util.getM2MToken()
    .then((token) => {
      req.log.debug(`Get topcoder user from identity service, userId = ${userId}`);

      return util.getTopcoderUser(userId, token, req.log)
        .then((user) => {
          if (!user) {
            res.status(403)
              .json(util.wrapErrorResponse(req.id, 403, 'User does not exist.'));
            return res.end();
          }

          if (user.active) {
            res.status(403)
              .json(util.wrapErrorResponse(req.id, 403, 'User is not inactive.'));
            return res.end();
          }

          // Store user into the request
          req.authUser = user;
          req.authUser.userId = user.id;
          req.authUser.roles = req.authUser.roles || [];
          req.log.debug('req.authUser=>', req.authUser);

          return next();
        });
    })
    .catch((err) => {
      req.log.error('Failed to get m2m token', err);
      next(err);
    });
};
