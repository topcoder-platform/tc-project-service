import config from 'config';
// import _ from 'lodash';
import crypto from 'crypto';
import querystring from 'querystring';

/**
 * Generates a random Nonce
 *
 * @param {Integer} len required length of a random nonce
 * @returns {String} a unique string of given length, to be used as nonce
 */
function nonce(len) {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (let i = 0; i < len; i += 1) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }

  return text;
}

/**
 * Encodes the given string in UNICODE
 *
 * @param {String} string String to be encoded
 * @returns {String} unicode encoded string
 */
function forceUnicodeEncoding(string) {
  return decodeURIComponent(encodeURIComponent(string));
}

/**
 * Creates signed embed URL for looker
 *
 * @param {Array} options array of configurable options
 * @returns {String} unique signed URL, it can be GET only once
 */
function createdSignedEmbedUrl(options) {
  // looker options
  const secret = options.secret;
  const host = options.host;

  // user options
  const jsonExternalUserId = JSON.stringify(options.external_user_id.toString());
  const jsonFirstName = JSON.stringify(options.first_name);
  const jsonLastName = JSON.stringify(options.last_name);
  const jsonPermissions = JSON.stringify(options.permissions);
  const jsonModels = JSON.stringify(options.models);
  const jsonGroupIds = JSON.stringify(options.group_ids);
  const jsonExternalGroupId = JSON.stringify(options.external_group_id || '');
  const jsonUserAttributes = JSON.stringify(options.user_attributes || {});
  const jsonAccessFilters = JSON.stringify(options.access_filters);

  // url/session specific options
  const embedPath = `/login/embed/${encodeURIComponent(options.embed_url)}`;
  const jsonSessionLength = JSON.stringify(options.session_length);
  const jsonForceLogoutLogin = JSON.stringify(options.force_logout_login);

  // computed options
  const jsonTime = JSON.stringify(Math.floor((new Date()).getTime() / 1000));
  const jsonNonce = JSON.stringify(nonce(16));

  // compute signature
  const stringToSign = `${host}\n${embedPath}\n${jsonNonce}\n${jsonTime}\n${jsonSessionLength}\n${jsonExternalUserId}\n${jsonPermissions}\n${jsonModels}\n${jsonGroupIds}\n${jsonExternalGroupId}\n${jsonUserAttributes}\n${jsonAccessFilters}`;// eslint-disable-line max-len

  const signature = crypto
    .createHmac('sha1', secret)
    .update(forceUnicodeEncoding(stringToSign))
    .digest('base64').trim();

  // construct query string
  const queryParams = {
    nonce: jsonNonce,
    time: jsonTime,
    session_length: jsonSessionLength,
    external_user_id: jsonExternalUserId,
    permissions: jsonPermissions,
    models: jsonModels,
    access_filters: jsonAccessFilters,
    first_name: jsonFirstName,
    last_name: jsonLastName,
    group_ids: jsonGroupIds,
    external_group_id: jsonExternalGroupId,
    user_attributes: jsonUserAttributes,
    force_logout_login: jsonForceLogoutLogin,
    signature,
  };

  const queryString = querystring.stringify(queryParams);

  return `${host}${embedPath}?${queryString}`;
}

/**
 * Generates the looker embed URL for the given look/dashboard.
 *
 * @param {Object} authUser requesting user
 * @param {Object} member member object for the requesting user
 * @param {String} reportUrl embed URL (look,dashboard etc)
 * @returns {String} URL for embedding the looker report, it can be GET only once
 */
function generateEmbedUrlForUser(authUser, member, reportUrl) {
  const SESSION_LENGTH = parseInt(config.lookerConfig.SESSION_LENGTH, 10);
  const urlData = {
    host: config.lookerConfig.LOOKER_HOST,
    secret: config.lookerConfig.EMBED_KEY,
    external_user_id: authUser.userId,
    group_ids: [],
    first_name: member.firstName,
    last_name: member.lastName,
    permissions: ['access_data', 'see_looks', 'see_user_dashboards', 'schedule_look_emails', 'download_with_limit'],
    models: ['tc_user_projects'],
    access_filters: {
      tc_user_projects: {
        tc_user_id: `${member.userId}`,
      },
    },
    user_attributes: {
      user_roles_project: member.role,
      user_roles_platform: authUser.roles,
      tc_user_id: member.userId,
    },
    session_length: SESSION_LENGTH,
    embed_url: reportUrl,
    force_logout_login: true,
  };

  const url = createdSignedEmbedUrl(urlData);
  return `https://${url}`;
}

/**
 * Generates the looker embed URL for the given look/dashboard.
 *
 * @param {Object} authUser requesting user
 * @param {Object} project project for which report URL is to be generated
 * @param {Object} member member object for the requesting user
 * @param {String} reportUrl embed URL (look,dashboard etc)
 * @returns {String} URL for embedding the looker report, it can be GET only once
 */
function generateEmbedUrlForProject(authUser, project, member, reportUrl) {
  const SESSION_LENGTH = parseInt(config.lookerConfig.SESSION_LENGTH, 10);
  const urlData = {
    host: config.lookerConfig.LOOKER_HOST,
    secret: config.lookerConfig.EMBED_KEY,
    external_user_id: authUser.userId,
    group_ids: [],
    first_name: member.firstName,
    last_name: member.lastName,
    permissions: ['access_data', 'see_looks', 'see_user_dashboards', 'schedule_look_emails', 'download_with_limit'],
    models: ['projects_tc_employees'],
    access_filters: {
      projects_tc_employees: {
        connect_project_id: `${project.id}`,
      },
    },
    user_attributes: {
      connect_project_id: `${project.id}`,
      user_roles_project: member.role,
      user_roles_platform: authUser.roles,
      tc_user_id: member.userId,
    },
    session_length: SESSION_LENGTH,
    embed_url: reportUrl,
    force_logout_login: true,
  };

  const url = createdSignedEmbedUrl(urlData);
  return `https://${url}`;
}

module.exports = {
  generateEmbedUrlForUser,
  generateEmbedUrlForProject,
};
