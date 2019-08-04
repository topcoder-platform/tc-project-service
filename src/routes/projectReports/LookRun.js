/* eslint-disable valid-jsdoc */
/* eslint-disable require-jsdoc */
/* eslint-disable func-names */

import config from 'config';
import request from 'superagent';
import parse from 'csv-parse';
import LookAuth from './LookAuth';

function LookApi() {
  this.BASE_URL = config.lookerConfig.BASE_URL;
  this.formatting = 'csv';
  this.limit = 5000;
  this.lookAuth = new LookAuth();
}

LookApi.prototype.runLook = function (lookId) {
  const endpoint = `${this.BASE_URL}/looks/${lookId}/run/${this.formatting}?limit=${this.limit}`;
  return this.callApi(endpoint);
};

LookApi.prototype.findUserByEmail = function (email) {
  const filter = { 'user.email': email };
  return this.runQueryWithFilter(1234, filter);
};

LookApi.prototype.findByHandle = function (handle) {
  const filter = { 'user.handle': handle };
  return this.runQueryWithFilter(12345, filter);
};

LookApi.prototype.runQueryWithFilter = function (queryId, filter) {
  const endpoint = `${this.BASE_URL}/queries/run/${this.formatting}`;

  const body = {
    id: queryId,
    model: 'topcoder_model_main',
    view: 'user',
    filters: filter,
    fields: ['user.coder_id', 'user.email', 'user.handle'],
    sorts: ['user.email desc 0'],
    limit: 10,
    query_timezon: 'America/Los_Angeles',
  };
  return this.callApi(endpoint, body);
};

LookApi.prototype.runQuery = function (queryId) {
  const endpoint = `${this.BASE_URL}/queries/${queryId}/run/${this.formatting}?limit=${this.limit}`;
  return this.callApi(endpoint);
};

/**
 *
 * @param {String} csvData: the csv data to be parsed.
 * @returns {Promise}
 */
function csvParse(csvData) {
  return new Promise((resolve, reject) => {
    const parser = parse(
      {
        delimiter: ',',
      },
      (err, records) => {
        if (err) {
          reject(err);
        } else {
          resolve(records);
        }
      },
    );
    // Write data to the stream
    parser.write(csvData);
    // Close the readable stream
    parser.end();
  });
}

LookApi.prototype.callApi = function (endpoint, body) {
  return this.lookAuth
    .getToken()
    .then((token) => {
      let newReq = null;
      if (body) {
        newReq = request
          .post(endpoint)
          .send(body)
          .set('Content-Type', 'application/json');
      } else {
        newReq = request.get(endpoint);
      }
      return newReq.set('Authorization', `token ${token}`);
    })
    .then(res => csvParse(res.body));
};

module.exports = LookApi;
