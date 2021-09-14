/**
 * This file defines methods for getting access tokens
 */

const _ = require('lodash');
const axios = require('axios');
const config = require('config');
const m2mAuth = require('tc-core-library-js').auth.m2m;

const m2m = m2mAuth(_.pick(config, ['AUTH0_URL', 'AUTH0_AUDIENCE', 'TOKEN_CACHE_TIME', 'AUTH0_PROXY_SERVER_URL']));

/**
 * Get m2mToken
 * @returns {String} the M2MToken
 */
async function getM2MToken() {
  return m2m.getMachineToken(config.AUTH0_CLIENT_ID, config.AUTH0_CLIENT_SECRET);
}

/**
 * Get user tokens from V2 API
 * @param {String} userName the user name
 * @param {String} userPassword the user password
 * @returns {Object} the user tokens
 */
async function getUserTokenV2(userName, userPassword) {
  const { data } = await axios({
    method: 'post',
    url: config.AUTH_V2_URL,
    data: {
      username: userName,
      password: userPassword,
      client_id: config.AUTH_V2_CLIENT_ID,
      sso: false,
      scope: 'openid profile offline_access',
      response_type: 'token',
      connection: 'TC-User-Database',
      grant_type: 'password',
      device: 'Browser',
    },
    headers: {
      'cache-control': 'no-cache',
      'content-type': 'application/json',
    },
  });
  return data;
}

/**
 * Get user token from V3 API
 * @param {String} idToken the id_token
 * @param {String} refreshToken the refresh_token
 * @returns {String} the user token
 */
async function getUserTokenV3(idToken, refreshToken) {
  const { data } = await axios({
    method: 'post',
    url: config.AUTH_V3_URL,
    data: {
      param: {
        externalToken: idToken,
        refreshToken,
      },
    },
    headers: {
      'cache-control': 'no-cache',
      'content-type': 'application/json;charset=UTF-8',
    },
  });
  return data;
}

/**
 * Get admin token from V3 API
 * @returns {String} The admin token
 */
async function getAdminToken() {
  const v2 = await getUserTokenV2(config.ADMIN_CREDENTIALS_USERNAME, config.ADMIN_CREDENTIALS_PASSWORD);
  const v3 = await getUserTokenV3(v2.id_token, v2.refresh_token);
  return _.get(v3, 'result.content.token');
}

/**
 * Get copilot token from V3 API
 * @returns {String} The copilot token
 */
async function getCopilotToken() {
  const v2 = await getUserTokenV2(config.COPILOT_CREDENTIALS_USERNAME, config.COPILOT_CREDENTIALS_PASSWORD);
  const v3 = await getUserTokenV3(v2.id_token, v2.refresh_token);
  return _.get(v3, 'result.content.token');
}

/**
 * Get regular user token from V3 API
 * @returns {String} The user token
 */
async function getUserToken() {
  const v2 = await getUserTokenV2(config.USER_CREDENTIALS_USERNAME, config.USER_CREDENTIALS_PASSWORD);
  const v3 = await getUserTokenV3(v2.id_token, v2.refresh_token);
  return _.get(v3, 'result.content.token');
}

/**
 * Uses axios to proxy post request
 * @param {String} url the url
 * @param {Object} data the query parameters, optional
 * @returns {Object} the response
 */
async function postRequest(url, data) {
  const m2mToken = await getAdminToken();
  const response = await axios({
    method: 'post',
    url,
    data,
    headers: {
      Authorization: `Bearer ${m2mToken}`,
      'cache-control': 'no-cache',
      'content-type': 'application/json;charset=UTF-8',
    },
  });
  return response;
}

module.exports = {
  getM2MToken,
  getAdminToken,
  getCopilotToken,
  getUserToken,
  postRequest,
};
