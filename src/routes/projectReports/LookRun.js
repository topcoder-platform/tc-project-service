/* eslint-disable valid-jsdoc */
/* eslint-disable require-jsdoc */
/* eslint-disable func-names */

import config from 'config';
import LookAuth from './LookAuth';

const axios = require('axios');

function LookApi(logger) {
  this.BASE_URL = config.lookerConfig.BASE_URL;
  this.formatting = 'json';
  this.limit = 5000;
  this.logger = logger;
  this.lookAuth = new LookAuth(logger);
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

LookApi.prototype.findProjectRegSubmissions = function (projectId) {
  const queryId = config.lookerConfig.QUERIES.REG_STATS;
  const fields = ['connect_project.id', 'challenge.track', 'challenge.num_registrations', 'challenge.num_submissions'];
  const view = 'challenge';
  const filters = { 'connect_project.id': projectId };
  return this.runQueryWithFilter(queryId, view, fields, filters);
};

LookApi.prototype.findProjectBudget = function (connectProjectId, permissions) {
  const queryId = config.lookerConfig.QUERIES.BUDGET;
  const { isManager, isAdmin, isCopilot, isCustomer } = permissions;

  const fields = [
    'project_stream.tc_connect_project_id',
  ];

  // Manager roles have access to more fields.
  if (isManager || isAdmin) {
    fields.push('project_stream.total_actual_challenge_fee');
  }
  if (isManager || isAdmin || isCopilot) {
    fields.push('project_stream.total_actual_member_payment');
  }
  if (isManager || isAdmin || isCustomer) {
    fields.push('project_stream.total_invoiced_amount', 'project_stream.remaining_invoiced_budget');
  }
  const view = 'project_stream';
  const filters = { 'project_stream.tc_connect_project_id': connectProjectId };
  return this.runQueryWithFilter(queryId, view, fields, filters);
};

LookApi.prototype.runQueryWithFilter = function (queryId, view, fields, filters) {
  const endpoint = `${this.BASE_URL}/queries/run/${this.formatting}`;

  const body = {
    id: queryId,
    model: 'topcoder_model_main',
    view,
    filters,
    fields,
    // sorts: ['user.email desc 0'],
    limit: 10,
    query_timezon: 'America/Los_Angeles',

  };
  return this.callApi(endpoint, body);
};

LookApi.prototype.runQuery = function (queryId) {
  const endpoint = `${this.BASE_URL}/queries/${queryId}/run/${this.formatting}?limit=${this.limit}`;
  return this.callApi(endpoint);
};

LookApi.prototype.callApi = function (endpoint, body) {
  return this.lookAuth.getToken().then((token) => {
    let newReq = null;
    if (body) {
      newReq = axios.post(endpoint, body, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `token ${token}`,
        },
      });
    } else {
      newReq = axios.get(endpoint);
    }
    return newReq;
  }).then((res) => {
    this.logger.info(res.data);
    return res.data;
  });
};

module.exports = LookApi;
