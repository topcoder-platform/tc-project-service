
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
import { ADMIN_ROLES, TOKEN_SCOPES, TIMELINE_REFERENCES } from './constants';

const exec = require('child_process').exec;
const models = require('./models').default;

const util = _.cloneDeep(require('tc-core-library-js').util(config));

// the client modifies the config object, so always passed the cloned object
let esClient = null;

_.assignIn(util, {
  /**
   * Build API error
   * @param {string} message the API error message
   * @param {number} status the API status code
   * @returns {Error} the built API error
   */
  buildApiError: (message, status) => {
    const apiErr = new Error(message);
    apiErr.status = status || 500;
    return apiErr;
  },
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
    const isMachineToken = _.get(req, 'authUser.isMachine', false);
    const tokenScopes = _.get(req, 'authUser.scopes', []);
    if (isMachineToken) {
      if (_.indexOf(tokenScopes, TOKEN_SCOPES.CONNECT_PROJECT_ADMIN) >= 0) return true;
      return false;
    }
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
    const isMachineToken = _.get(req, 'authUser.isMachine', false);
    const tokenScopes = _.get(req, 'authUser.scopes', []);
    if (isMachineToken) {
      if (_.indexOf(tokenScopes, TOKEN_SCOPES.CONNECT_PROJECT_ADMIN) >= 0) return true;
      return false;
    }
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
    const isMachineToken = _.get(req, 'authUser.isMachine', false);
    const tokenScopes = _.get(req, 'authUser.scopes', []);
    if (isMachineToken) {
      if (_.indexOf(tokenScopes, TOKEN_SCOPES.CONNECT_PROJECT_ADMIN) >= 0) return true;
      return false;
    }
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

  /**
  * Merge two JSON objects. For array fields, the target will be replaced by source.
  * @param {Object} targetObj the target object
  * @param {Object} sourceObj the source object
  * @returns {Object} the merged object
  */
  // eslint-disable-next-line consistent-return
  mergeJsonObjects: (targetObj, sourceObj) => _.mergeWith(targetObj, sourceObj, (target, source) => {
    // Overwrite the array
    if (_.isArray(source)) {
      return source;
    }
  }),

  /**
   * The middleware to validate and get the projectId specified by the timeline request object,
   * and set to the request params. This should be called after the validate() middleware,
   * and before the permissions() middleware.
   * @param {Object} req the express request instance
   * @param {Object} res the express response instance
   * @param {Function} next the express next middleware
   */
  // eslint-disable-next-line valid-jsdoc
  validateTimelineRequestBody: (req, res, next) => {
    // The timeline refers to a project
    if (req.body.param.reference === TIMELINE_REFERENCES.PROJECT) {
      // Set projectId to the params so it can be used in the permission check middleware
      req.params.projectId = req.body.param.referenceId;

      // Validate projectId to be existed
      return models.Project.findOne({
        where: {
          id: req.params.projectId,
          deletedAt: { $eq: null },
        },
      })
        .then((project) => {
          if (!project) {
            const apiErr = new Error(`Project not found for project id ${req.params.projectId}`);
            apiErr.status = 422;
            return next(apiErr);
          }

          return next();
        });
    }

    // The timeline refers to a phase
    return models.ProjectPhase.findOne({
      where: {
        id: req.body.param.referenceId,
        deletedAt: { $eq: null },
      },
    })
      .then((phase) => {
        if (!phase) {
          const apiErr = new Error(`Phase not found for phase id ${req.body.param.referenceId}`);
          apiErr.status = 422;
          return next(apiErr);
        }

        // Set projectId to the params so it can be used in the permission check middleware
        req.params.projectId = req.body.param.referenceId;
        return next();
      });
  },

  /**
   * The middleware to validate and get the projectId specified by the timelineId from request
   * path parameter, and set to the request params. This should be called after the validate()
   * middleware, and before the permissions() middleware.
   * @param {Object} req the express request instance
   * @param {Object} res the express response instance
   * @param {Function} next the express next middleware
   */
  // eslint-disable-next-line valid-jsdoc
  validateTimelineIdParam: (req, res, next) => {
    models.Timeline.findById(req.params.timelineId)
      .then((timeline) => {
        if (!timeline) {
          const apiErr = new Error(`Timeline not found for timeline id ${req.params.timelineId}`);
          apiErr.status = 404;
          return next(apiErr);
        }

        // Set timeline to the request to be used in the next middleware
        req.timeline = timeline;

        // The timeline refers to a project
        if (timeline.reference === TIMELINE_REFERENCES.PROJECT) {
          // Set projectId to the params so it can be used in the permission check middleware
          req.params.projectId = timeline.referenceId;
          return next();
        }

        // The timeline refers to a phase
        return models.ProjectPhase.findOne({
          where: {
            id: timeline.referenceId,
            deletedAt: { $eq: null },
          },
        })
          .then((phase) => {
            // Set projectId to the params so it can be used in the permission check middleware
            req.params.projectId = phase.projectId;
            return next();
          });
      });
  },
});

export default util;
