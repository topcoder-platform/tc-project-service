
/* globals Promise */
/*
 * Copyright (C) 2016 TopCoder Inc., All Rights Reserved.
 */
/**
 * This is utils file.
 * @author TCDEVELOPER
 * @version 1.0
 */


import _ from 'lodash';
import querystring from 'querystring';
import config from 'config';
import urlencode from 'urlencode';
import elasticsearch from 'elasticsearch';
import Promise from 'bluebird';
import AWS from 'aws-sdk';
import { ADMIN_ROLES } from './constants';

const exec = require('child_process').exec;
const models = require('./models').default;

const util = _.cloneDeep(require('tc-core-library-js').util(config));

// the client modifies the config object, so always passed the cloned object
let esClient = null;

_.assignIn(util, {
  /**
   * Handle error
   * @param   {String}    msg               the default error message
   * @param   {Error}     err               the err
   * @param   {Object}    req               the request
   * @param   {Function}  next              the next function
   * @returns {Function}                    next function with error
   */
  handleError: (msg, err, req, next) => {
    req.log.error({
      message: msg,
      error: err,
    });
    const apiErr = new Error(msg);
    _.assign(apiErr, {
      status: _.get(err, 'status', 500),
      details: _.get(err, 'details', msg),
    });
    return next(apiErr);
  },
  /**
   * Validates if filters are valid
   * @param  {object}   filters         object with filters
   * @param  {array}    validValues     valid filter values
   * @return {boolean}                  true if filters are valid otherwise false
   */
  isValidFilter: (filters, validValues) => {
    let valid = true;
    _.each(_.keys(filters), (k) => {
      if (valid && _.indexOf(validValues, k) < 0) {
        valid = false;
      }
    });
    return valid;
  },
  /**
   * Helper funtion to verify if user has specified role
   * @param  {object} req  Request object that should contain authUser
   * @param  {string} role specified role
   * @return {boolean}      true/false
   */
  hasRole: (req, role) => {
    let roles = _.get(req, 'authUser.roles', []);
    roles = roles.map(s => s.toLowerCase());
    return _.indexOf(roles, role.toLowerCase()) >= 0;
  },
  /**
   * Helper funtion to verify if user has specified roles
   * @param  {object} req  Request object that should contain authUser
   * @param  {Array} roles specified roles
   * @return {boolean}      true/false
   */
  hasRoles: (req, roles) => {
    let authRoles = _.get(req, 'authUser.roles', []);
    authRoles = authRoles.map(s => s.toLowerCase());
    return _.intersection(authRoles, roles.map(r => r.toLowerCase())).length > 0;
  },
  /**
   * Helper funtion to find intersection (case insensitive) between two arrays
   * @param  {Array} array1 first array of strings
   * @param  {Array} array2 second array of strings
   * @return {boolean}      true/false
   */
  hasIntersection: (array1, array2) => {
    const lowercased = array1.map(s => s.toLowerCase());
    return _.intersection(lowercased, array2.map(r => r.toLowerCase())).length > 0;
  },
  /**
   * Helper funtion to verify if user has admin roles
   * @param  {object} req  Request object that should contain authUser
   * @return {boolean}      true/false
   */
  hasAdminRole: (req) => {
    let roles = _.get(req, 'authUser.roles', []);
    roles = roles.map(s => s.toLowerCase());
    return _.intersection(roles, ADMIN_ROLES.map(r => r.toLowerCase())).length > 0;
  },

  /**
   * Parses query fields and groups them per table
   * @param  {array}      queryFields     list of query fields
   * @param  {Object}     allowedFields   the allowed fields
   * @return {object}                     the parsed fields
   */
  parseFields: (queryFields, allowedFields) => {
    const fields = _.cloneDeep(allowedFields);
    if (queryFields.length) {
      // remove any inavlid fields
      fields.projects = _.intersection(queryFields, allowedFields.projects);
      fields.project_members = _.filter(queryFields, f => f.indexOf('members.') === 0);
      // remove members. prefix
      fields.project_members = _.map(fields.project_members, f => f.substring(8));
      // remove any errorneous fields
      fields.project_members = _.intersection(fields.project_members, allowedFields.project_members);
      if (fields.project_members.length === 0 && _.indexOf(queryFields, 'members') > -1) {
        fields.project_members = allowedFields.project_members;
      }
    }
    return fields;
  },

  /**
   * Parse the query filters
   * @param  {String}   fqueryFilter        the query filter string
   * @return {Object}                       the parsed array
   */
  parseQueryFilter: (fqueryFilter) => {
    let queryFilter = querystring.parse(fqueryFilter);
    // convert in to array
    queryFilter = _.mapValues(queryFilter, (val) => {
      if (val.indexOf('in(') > -1) {
        return { $in: val.substring(3, val.length - 1).split(',') };
      }
      return val;
    });
    if (queryFilter.id) {
      queryFilter.id.$in = _.map(queryFilter.id.$in, _.parseInt);
    }
    return queryFilter;
  },

  /**
   * Moves file from source to destination
   * @param  {object} req    request object
   * @param  {object} source source object
   * @param  {string} dest   destination url
   * @return {promise}       promise
   */
  s3FileTransfer: (req, source, dest) => new Promise((resolve, reject) => {
    const cmdStr = _.join([
      'aws s3 mv',
      `"${source}"`,
      `"${dest}"`,
      '--region us-east-1',
    ], ' ');
    exec(cmdStr, (error, stdout, stderr) => {
      req.log.debug(`s3FileTransfer: stdout: ${stdout}`);
      req.log.debug(`s3FileTransfer: stderr: ${stderr}`);
      if (error !== null) {
        req.log.error(`exec error: ${error}`);
        return reject(error);
      }
      return resolve({ success: true });
    });
  }),


  /**
   * retrieve download urls for all attachments
   * @param  {Object}     req         original request
   * @param  {String}     filePath    the file path
   * @return {String}                 the download url
   */
  getFileDownloadUrl: (req, filePath) => {
    if (!filePath) {
      return Promise.reject(new Error('file path empty'));
    }
    let fileServiceUrl = config.get('fileServiceEndpoint');
    if (fileServiceUrl.substr(-1) !== '/') fileServiceUrl += '/';
    // get presigned Url
    const httpClient = util.getHttpClient(req);
    httpClient.defaults.headers.common.Authorization = req.headers.authorization;
    return httpClient.post(`${fileServiceUrl}downloadurl`, {
      param: {
        filePath,
      },
    })
      .then((resp) => {
        req.log.debug('Retreiving Presigned Url resp: ', JSON.stringify(resp.data, null, 2));
        if (resp.status !== 200 || resp.data.result.status !== 200) {
          return Promise.reject(new Error('Unable to fetch pre-signed url'));
        }
        return [
          filePath,
          resp.data.result.content.preSignedURL,
        ];
      });
  },
  getProjectAttachments: (req, projectId) => {
    let attachments = [];
    return models.ProjectAttachment.getActiveProjectAttachments(projectId)
        .then((_attachments) => {
          // if attachments were requested
          if (attachments) {
            attachments = _attachments;
          } else {
            return attachments;
          }
          // TODO consider using redis to cache attachments urls
          const promises = [];
          _.each(attachments, (a) => {
            promises.push(util.getFileDownloadUrl(req, a.filePath));
          });
          return Promise.all(promises);
        })
        .then((result) => {
          // result is an array of 'tuples' => [[path, url], [path,url]]
          // convert it to a map for easy lookup
          const urls = _.fromPairs(result);
          _.each(attachments, (at) => {
            const a = at;
            a.downloadUrl = urls[a.filePath];
          });
          return attachments;
        });
  },

  getSystemUserToken: (logger, id = 'system') => {
    const httpClient = util.getHttpClient({ id, log: logger });
    const url = `${config.get('identityServiceEndpoint')}authorizations`;
    const formData = `clientId=${config.get('systemUserClientId')}&` +
      `secret=${encodeURIComponent(config.get('systemUserClientSecret'))}`;
    return httpClient.post(url, formData,
      {
        timeout: 4000,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      },
      )
      .then(res => res.data.result.content.token);
  },

    /**
     * Fetches the topcoder user details using the given JWT token.
     *
     * @param {Number}  userId        id of the user to be fetched
     * @param {String}  jwtToken      JWT token of the admin user or JWT token of the user to be fecthed
     * @param {Object}  logger        logger to be used for logging purposes
     *
     * @return {Promise}              promise which resolves to the user's information
     */
  getTopcoderUser: (userId, jwtToken, logger) => {
    const httpClient = util.getHttpClient({ id: `userService_${userId}`, log: logger });
    httpClient.defaults.timeout = 3000;
    httpClient.defaults.headers.common.Accept = 'application/json';
    httpClient.defaults.headers.common['Content-Type'] = 'application/json';
    httpClient.defaults.headers.common.Authorization = `Bearer ${jwtToken}`;
    return httpClient.get(`${config.identityServiceEndpoint}users/${userId}`).then((response) => {
      if (response.data && response.data.result
          && response.data.result.status === 200 && response.data.result.content) {
        return response.data.result.content;
      }
      return null;
    });
  },

  /**
   * Return the initialized elastic search client
   * @return {Object}           the elasticsearch client instance
   */
  getElasticSearchClient: () => {
    if (esClient) return esClient;
    const esHost = config.get('elasticsearchConfig.host');
    if (/.*amazonaws.*/.test(esHost)) {
      esClient = elasticsearch.Client({
        apiVersion: config.get('elasticsearchConfig.apiVersion'),
        hosts: esHost,
        connectionClass: require('http-aws-es'), // eslint-disable-line global-require
        amazonES: {
          region: 'us-east-1',
          credentials: new AWS.EnvironmentCredentials('AWS'),
        },
      });
    } else {
      esClient = new elasticsearch.Client(_.cloneDeep(config.elasticsearchConfig));
    }
    return esClient;
  },

  /**
   * Retrieve member details from userIds
   */
  getMemberDetailsByUserIds: Promise.coroutine(function* (userIds, logger, requestId) { // eslint-disable-line func-names
    try {
      const token = yield this.getSystemUserToken(logger);
      const httpClient = this.getHttpClient({ id: requestId, log: logger });
      return httpClient.get(`${config.memberServiceEndpoint}/_search`, {
        params: {
          query: `${userIds.join(urlencode(' OR ', 'utf8'))}`,
          fields: 'userId,handle,firstName,lastName,email',
        },
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      }).then(res => _.get(res, 'data.result.content', null));
    } catch (err) {
      return Promise.reject(err);
    }
  }),

  /**
   * Retrieve member details from userIds
   */
  getUserRoles: Promise.coroutine(function* (userId, logger, requestId) { // eslint-disable-line func-names
    try {
      const token = yield this.getSystemUserToken(logger);
      const httpClient = this.getHttpClient({ id: requestId, log: logger });
      return httpClient.get(`${config.identityServiceEndpoint}roles`, {
        params: {
          filter: `subjectID=${userId}`,
        },
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      }).then(res => _.get(res, 'data.result.content', []).map(r => r.roleName));
    } catch (err) {
      return Promise.reject(err);
    }
  }),
});

export default util;
