/* eslint-disable func-names */
/* eslint-disable require-jsdoc */
/* eslint-disable valid-jsdoc */

// Look Auth


import config from 'config';
import request from 'superagent';

const NEXT_5_MINS = 5 * 60 * 1000;


function LookAuth() {
  // load credentials from config
  this.BASE_URL = config.lookerConfig.BASE_URL;
  this.CLIENT_ID = config.lookerConfig.CLIENT_ID;
  this.CLIENT_SECRET = config.lookerConfig.CLIENT_SECRET;
  const token = config.lookerConfig.TOKEN;

  // Token is stringified and saved as string. It has 4 properties, access_token, expires_in and type, timestamp
  if (token) {
    this.lastToken = JSON.stringify(token);
  }
}

LookAuth.prototype.getToken = function () {
  return new Promise((resolve) => {
    if (!this.isExpired()) {
      resolve(this.lastToken.access_token);
    } else {
      resolve('');
    }
  }).then((res) => {
    if (res === '') {
      return this.login();
    }
    return res;
  });
};

/** *********************Login to Looker ************** */
LookAuth.prototype.login = function () {
  return request.post(`${this.BASE_URL}/login?client_id=${this.CLIENT_ID}&client_secret=${this.CLIENT_SECRET}`)
  .then((res) => {
    try {
      this.lastToken = JSON.parse(res.body);
    } catch (err) {
      throw new Error('Invalid response json');
    }
    this.lastToken.timestamp = new Date().getTime();
  });
};


/** ***************Check if the Token has expired ********** */
LookAuth.prototype.isExpired = function () {
  // If no token is present, assume the token has expired
  if (!this.lastToken) {
    return true;
  }

  const tokenTimestamp = this.lastToken.timestamp;
  const expiresIn = this.lastToken.expires_in;
  const currentTimestamp = new Date().getTime();

  // If the token will good for next 5 minutes
  if ((tokenTimestamp + expiresIn + NEXT_5_MINS) > currentTimestamp) {
    return false;
  }
  // Token is good, and can be used to make the next call.
  return true;
};

module.exports = LookAuth;
