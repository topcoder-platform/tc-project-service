
/*
 * Copyright (C) 2016 TopCoder Inc., All Rights Reserved.
 */
/**
 * This is utils file.
 * @author TCDEVELOPER
 * @version 1.0
 */

import * as fs from 'fs';
import * as path from 'path';
import _ from 'lodash';
import querystring from 'querystring';
import config from 'config';
import urlencode from 'urlencode';
import elasticsearch from 'elasticsearch';
import AWS from 'aws-sdk';
import jp from 'jsonpath';
import Promise from 'bluebird';
import coreLib from 'tc-core-library-js';
import models from './models';

import {
  ADMIN_ROLES,
  M2M_SCOPES,
  EVENT,
  PROJECT_MEMBER_ROLE,
  VALUE_TYPE,
  ESTIMATION_TYPE,
  RESOURCES,
  USER_ROLE,
  INVITE_STATUS,
} from './constants';
import { PERMISSION, DEFAULT_PROJECT_ROLE } from './permissions/constants';

const tcCoreLibAuth = require('tc-core-library-js').auth;

const m2m = tcCoreLibAuth.m2m(config);

/**
 * @type {projectServiceUtils}
 */
const util = _.cloneDeep(require('tc-core-library-js').util(config));

const ssoRefCodes = JSON.parse(config.get('SSO_REFCODES'));

// the client modifies the config object, so always passed the cloned object
let esClient = null;

const projectServiceUtils = {
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
   * Calculate project estimation item price
   * @param  {object}   valueType       value type can be int, string, double, percentage
   * @param  {String}   value           value
   * @param  {Double}   price           price
   * @return {Double|String}            calculated price value
   */
  calculateEstimationItemPrice: (valueType, value, price) => {
    if (valueType === VALUE_TYPE.PERCENTAGE) {
      return (value * price) / 100;
    }
    return value;
  },
  /**
   * Calculate project estimation item price
   * @param   {Object}    req               the request
   * @param  {Number}     projectId         project id
   * @return {Array}  estimation items
   */
  calculateProjectEstimationItems: (req, projectId) =>
    // delete ALL existent ProjectEstimationItems for the project
    models.ProjectEstimationItem.deleteAllForProject(models, projectId, req.authUser, {
      includeAllProjectEstimatinoItemsForInternalUsage: true,
    })

      // retrieve ProjectSettings and ProjectEstimations
      .then(() => Promise.all([
        models.ProjectSetting.findAll({
          includeAllProjectSettingsForInternalUsage: true,
          where: {
            projectId,
            key: _.map(_.values(ESTIMATION_TYPE), type => `markup_${type}`),
          },
          raw: true,
        }),
        models.ProjectEstimation.findAll({
          where: { projectId: req.params.projectId },
          raw: true,
        }),
      ]))

      // create ProjectEstimationItems
      .then(([settings, estimations]) => {
        if (!settings || settings.length === 0) {
          req.log.debug('No project settings for prices found, therefore no estimation items are created');
          return [];
        }

        if (!estimations || estimations.length === 0) {
          req.log.debug('No price estimations found, therefore no estimation items are created');
          return [];
        }

        const estimationItems = [];
        _.each(estimations, (estimation) => {
          _.each(settings, (setting) => {
            estimationItems.push({
              projectEstimationId: estimation.id,
              price: util.calculateEstimationItemPrice(setting.valueType, setting.value, estimation.price),
              type: setting.key.replace(/^markup_/, ''),
              markupUsedReference: 'projectSetting',
              markupUsedReferenceId: setting.id,
              createdBy: req.authUser.userId,
              updatedBy: req.authUser.userId,
            });
          });
        });

        return models.ProjectEstimationItem.bulkCreate(estimationItems);
      }),
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
      if (_.indexOf(tokenScopes, M2M_SCOPES.CONNECT_PROJECT_ADMIN) >= 0) return true;
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
      if (_.indexOf(tokenScopes, M2M_SCOPES.CONNECT_PROJECT_ADMIN) >= 0) return true;
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
      if (_.indexOf(tokenScopes, M2M_SCOPES.CONNECT_PROJECT_ADMIN) >= 0) return true;
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

      const parseSubFields = (name, strName) => {
        fields[name] = _.filter(queryFields, f => f.indexOf(`${strName}.`) === 0);
        fields[name] = _.map(fields[name], f => f.substring(strName.length + 1));
        fields[name] = _.intersection(fields[name], allowedFields[name]);
        if (fields[name].length === 0 && _.indexOf(queryFields, strName) > -1) {
          fields[name] = allowedFields[name];
        }
      };

      if (allowedFields.project_members) {
        parseSubFields('project_members', 'members');
      }
      if (allowedFields.project_member_invites) {
        parseSubFields('project_member_invites', 'invites');
      }

      if (allowedFields.attachments) {
        parseSubFields('attachments', 'attachments');
      }

      if (allowedFields.project_phases) {
        parseSubFields('project_phases', 'phases');
      }

      if (allowedFields.project_phases_products) {
        parseSubFields('project_phases_products', 'phases.products');
      }
    }
    return fields;
  },

  /**
   * Add user details fields to the list of field, if it's allowed to a user who made the request
   *
   * @param  {Array}  fields fields list
   * @param  {Object} req    request object
   *
   * @return {Array} fields list with 'email' if allowed
   */
  addUserDetailsFieldsIfAllowed: (fields, req) => {
    // Only Topcoder Admins can get email
    if (util.hasPermissionByReq(PERMISSION.READ_PROJECT_MEMBER_DETAILS, req)) {
      return _.concat(fields, ['email', 'firstName', 'lastName']);
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
    if (queryFilter.id && queryFilter.id.$in) {
      queryFilter.id.$in = _.map(queryFilter.id.$in, _.parseInt);
    }
    return queryFilter;
  },

  /**
   * Moves file from source to destination
   * @param  {object} req          request object
   * @param  {string} sourceBucket source bucket
   * @param  {string} sourceKey    source key
   * @param  {string} destBucket   destination bucket
   * @param  {string} destKey      destination key
   * @return {promise}       promise
   */
  s3FileTransfer: async (req, sourceBucket, sourceKey, destBucket, destKey) => {
    const s3 = new AWS.S3({
      Region: 'us-east-1',
      apiVersion: '2006-03-01',
    });

    try {
      const sourceParam = {
        Bucket: sourceBucket,
        Key: sourceKey,
      };

      const copyParam = {
        Bucket: destBucket,
        Key: destKey,
        CopySource: `${sourceBucket}/${sourceKey}`,
      };

      await s3.copyObject(copyParam).promise();
      req.log.debug(`s3FileTransfer: copyObject successfully: ${sourceBucket}/${sourceKey}`);
      // we don't want deleteObject to block the request as it's not critical operation
      (async () => {
        try {
          await s3.deleteObject(sourceParam).promise();
          req.log.debug(`s3FileTransfer: deleteObject successfully: ${sourceBucket}/${sourceKey}`);
        } catch (e) {
          req.log.error(`s3FileTransfer: deleteObject failed: ${sourceBucket}/${sourceKey} : ${e.message}`);
        }
      })();
      return { success: true };
    } catch (e) {
      req.log.error(`s3FileTransfer: error: ${e.message}`);
      throw e;
    }
  },


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
        return resp.data.result.content.preSignedURL;
      });
  },
  getProjectAttachments: (req, projectId) => {
    let attachments = [];
    let attachmentsPromise;
    if (util.hasAdminRole(req)) {
      attachmentsPromise = models.ProjectAttachment.getActiveProjectAttachments(projectId);
    } else {
      attachmentsPromise = models.ProjectAttachment.getAttachmentsForUser(projectId, req.authUser.userId);
    }
    return attachmentsPromise
      .then((_attachments) => {
        // if attachments were requested
        if (_attachments) {
          attachments = _attachments;
        }
        return attachments;
      });
  },

  /**
   * Get machine to machine token.
   * @returns {Promise} promise which resolves to the m2m token
   */
  getM2MToken: () => m2m.getMachineToken(config.AUTH0_CLIENT_ID, config.AUTH0_CLIENT_SECRET),

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
    return httpClient.get(`${config.identityServiceEndpoint}users`, {
      params: {
        filter: `id=${userId}`,
      },
    })
      .then((response) => {
        if (response.data && response.data.result
        && response.data.result.status === 200 && response.data.result.content
        && response.data.result.content.length === 1) {
          return response.data.result.content[0];
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
        // amazonES: {
        //   region: 'us-east-1',
        //   credentials: new AWS.EnvironmentCredentials('AWS'),
        // },
      });
    } else {
      esClient = new elasticsearch.Client(_.cloneDeep(config.elasticsearchConfig));
    }
    // during unit tests, we need to refresh the indices
    // before making get/search requests to make sure all ES data can be visible.
    if (process.env.NODE_ENV === 'test') {
      esClient.originalSearch = esClient.search;
      esClient.search = (params, cb) => esClient.indices.refresh({ index: '' })
        .then(() => esClient.originalSearch(params, cb)); // refresh index before reply
      esClient.originalGet = esClient.get;
      esClient.get = (params, cb) => esClient.indices.refresh({ index: '' })
        .then(() => esClient.originalGet(params, cb)); // refresh index before reply
    }
    return esClient;
  },

  /**
   * Return the searched resource from elastic search
   * @param resource resource name
   * @param query    search query
   * @param index    index to search from
   * @return {Object}           the searched resource
   */
  fetchFromES: Promise.coroutine(function* (resource, query, index) { // eslint-disable-line func-names
    let INDEX = config.get('elasticsearchConfig.metadataIndexName');
    let TYPE = config.get('elasticsearchConfig.metadataDocType');
    if (index === 'timeline') {
      INDEX = config.get('elasticsearchConfig.timelineIndexName');
      TYPE = config.get('elasticsearchConfig.timelineDocType');
    } else if (index === 'project') {
      INDEX = config.get('elasticsearchConfig.indexName');
      TYPE = config.get('elasticsearchConfig.docType');
    }

    const data = query ? (yield esClient.search({ index: INDEX, type: TYPE, body: query })) :
      (yield esClient.search({ index: INDEX, type: TYPE }));
    if (data.hits.hits.length > 0 && data.hits.hits[0].inner_hits) {
      return data.hits.hits[0].inner_hits;
    }

    return data.hits.hits.length > 0 ? data.hits.hits[0]._source : { // eslint-disable-line no-underscore-dangle
      productTemplates: [],
      forms: [],
      projectTemplates: [],
      planConfigs: [],
      priceConfigs: [],
      projectTypes: [],
      productCategories: [],
      orgConfigs: [],
      milestoneTemplates: [],
    };
  }),

  /**
   * Return the searched resource from elastic search PROJECT index
   * @param resource resource name
   * @param query    search query
   * @param index    index to search from
   * @return {Array}           the searched resource
   */
  fetchByIdFromES: Promise.coroutine(function* (resource, query, index) { // eslint-disable-line func-names
    let INDEX = config.get('elasticsearchConfig.indexName');
    let TYPE = config.get('elasticsearchConfig.docType');
    if (index === 'timeline') {
      INDEX = config.get('elasticsearchConfig.timelineIndexName');
      TYPE = config.get('elasticsearchConfig.timelineDocType');
    } else if (index === 'metadata') {
      INDEX = config.get('elasticsearchConfig.metadataIndexName');
      TYPE = config.get('elasticsearchConfig.metadataDocType');
    }

    return (yield esClient.search({
      index: INDEX,
      type: TYPE,
      _source: false,
      body: query,
    })).hits.hits;
  }),

  /**
   * Retrieve member traits from user handle
   */
  getMemberTraitsByHandle: Promise.coroutine(function* (handle, logger, requestId) { // eslint-disable-line func-names
    try {
      const token = yield this.getM2MToken();
      const httpClient = this.getHttpClient({ id: requestId, log: logger });
      if (logger) {
        logger.trace(handle);
      }

      return httpClient.get(`${config.memberServiceEndpoint}/${handle}/traits`, {
        params: {},
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
  getMemberDetailsByUserIds: Promise.coroutine(function* (userIds, logger, requestId) { // eslint-disable-line func-names
    try {
      const token = yield this.getM2MToken();
      const httpClient = this.getHttpClient({ id: requestId, log: logger });
      if (logger) {
        logger.trace(userIds);
      }
      return httpClient.get(`${config.memberServiceEndpoint}/_search`, {
        params: {
          query: `${_.map(userIds, id => `userId:${id}`).join(urlencode(' OR ', 'utf8'))}`,
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
   * Retrieve member details from user handles
   */
  getMemberDetailsByHandles: Promise.coroutine(function* (handles, logger, requestId) { // eslint-disable-line func-names
    if (_.isNil(handles) || (_.isArray(handles) && handles.length <= 0)) {
      return Promise.resolve([]);
    }
    try {
      const token = yield this.getM2MToken();
      const httpClient = this.getHttpClient({ id: requestId, log: logger });
      if (logger) {
        logger.trace(handles);
      }
      const handleArr = _.map(handles, h => `handleLower:${h.toLowerCase()}`);
      return httpClient.get(`${config.memberServiceEndpoint}/_search`, {
        params: {
          query: `${handleArr.join(urlencode(' OR ', 'utf8'))}`,
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
   * maksEmail
   *
   * @param {String} email emailstring
   *
   * @return {String} email has been masked
   */
  maskEmail: (email) => {
    // common function for formating
    const addMask = (str) => {
      const len = str.length;
      if (len === 1) {
        return `${str}***${str}`;
      }
      return `${str[0]}***${str[len - 1]}`;
    };

    try {
      const mailParts = email.split('@');

      let userName = mailParts[0];
      userName = addMask(userName);
      mailParts[0] = userName;

      const index = mailParts[1].lastIndexOf('.');
      if (index !== -1) {
        mailParts[1] = `${addMask(mailParts[1].slice(0, index))}.${mailParts[1].slice(index + 1)}`;
      }

      return mailParts.join('@');
    } catch (e) {
      return email;
    }
  },
  /**
   * Post-process given invite(s)
   * Mask `email` and hide `userId` to prevent leaking Personally Identifiable Information (PII)
   *
   * Immutable - doesn't modify data, but creates a clone.
   *
   * @param {String}  jsonPath  jsonpath string
   * @param {Object}  data      the data which  need to process
   * @param {Object}  req       The request object
   *
   * @return {Object} data has been processed
   */
  postProcessInvites: (jsonPath, data, req) => {
    // clone data to avoid mutations
    const dataClone = _.cloneDeep(data);

    const isAdmin = util.hasPermissionByReq({ topcoderRoles: [USER_ROLE.TOPCODER_ADMIN] }, req);
    const currentUserId = req.authUser.userId;
    const currentUserEmail = req.authUser.email;

    // admins can get data as it is
    if (isAdmin) {
      // even though we didn't make any changes to the data, return a clone here for consistency
      return dataClone;
    }

    const postProcessInvite = (invite) => {
      if (!_.has(invite, 'email')) {
        return invite;
      }

      if (invite.email) {
        const canSeeEmail = (
          isAdmin || // admin
          invite.createdBy === currentUserId || // user who created invite
          (invite.userId !== null && invite.userId === currentUserId) || // user who is invited by `handle`
          ( // user who is invited by `email` (invite doesn't have `userId`)
            invite.userId === null &&
            invite.email &&
            currentUserEmail &&
            invite.email.toLowerCase() === currentUserEmail.toLowerCase()
          )
        );
        // mask email if user cannot see it
        _.assign(invite, {
          email: canSeeEmail ? invite.email : util.maskEmail(invite.email),
        });

        const canGetUserId = (
          isAdmin || // admin
          invite.userId === currentUserId // user who is invited
        );
        if (invite.userId && !canGetUserId) {
          _.assign(invite, {
            userId: null,
          });
        }
      }

      return invite;
    };

    jp.apply(dataClone, jsonPath, (value) => {
      if (_.isObject(value)) {
        // data contains nested invite object
        return postProcessInvite(value);
      }
      // data is single invite object
      // value is string or null
      return postProcessInvite(dataClone).email;
    });

    return dataClone;
  },

  /**
   * Filter member details by input fields
   *
   * @param {Array}   members   Array of member detail objects
   * @param {Array}   fields    Array of fields to be used to filter member objects
   * @param {Object}  req       The request object
   *
   * @return {Array}            Filtered array of member detail objects
   */
  getObjectsWithMemberDetails: async (members, fields, req) => {
    if (!fields || _.isEmpty(fields) || _.isEmpty(members)) {
      return members;
    }
    const memberTraitFields = ['photoURL', 'workingHourStart', 'workingHourEnd', 'timeZone'];
    let memberDetailFields = ['handle'];

    // Only Topcoder admins can get emails, first and last name for users
    memberDetailFields = util.addUserDetailsFieldsIfAllowed(memberDetailFields, req);

    let allMemberDetails = [];
    if (_.intersection(fields, _.union(memberDetailFields, memberTraitFields)).length > 0) {
      const userIds = _.reject(_.map(members, 'userId'), _.isNil); // some invites may have no `userId`
      allMemberDetails = await util.getMemberDetailsByUserIds(userIds, req.log, req.id);

      if (_.intersection(fields, memberTraitFields).length > 0) {
        const promises = _.map(
          allMemberDetails,
          member => util.getMemberTraitsByHandle(member.handle, req.log, req.id).catch((err) => {
            req.log.error(`Cannot get traits for user (userId:${member.userId}, handle: ${member.handle}).`);
            req.log.debug(`Error getting traits for user (userId:${member.userId}, handle: ${member.handle}).`, err);
          }),
        );
        const traits = await Promise.all(promises);
        _.each(traits, (memberTraits) => {
          // if we didn't manage to get traits for the user, skip it
          if (!memberTraits) return;

          const basicInfo = _.find(memberTraits, trait => trait.traitId === 'basic_info');
          const connectInfo = _.find(memberTraits, trait => trait.traitId === 'connect_info');
          const memberIndex = _.findIndex(
            allMemberDetails,
            member => member.userId === _.get(basicInfo, 'traits.data[0].userId'),
          );
          const basicDetails = {
            photoURL: _.get(basicInfo, 'traits.data[0].photoURL'),
          };
          const connectDetails = _.pick(
            _.get(connectInfo, 'traits.data.0'),
            'workingHourStart', 'workingHourEnd', 'timeZone',
          );
          allMemberDetails.splice(
            memberIndex, 1,
            _.assign({}, allMemberDetails[memberIndex], basicDetails, connectDetails),
          );
        });
      }
    }

    // set default null value for all valid fields
    const memberDefaults = _.reduce(fields, (acc, field) => {
      const isValidField = _.includes(_.union(memberDetailFields, memberTraitFields), field);
      if (isValidField) {
        acc[field] = null;
      }
      return acc;
    }, {});

    // pick valid fields from fetched member details
    return _.map(members, (member) => {
      let memberDetails = _.find(allMemberDetails, ({ userId }) => userId === member.userId);
      memberDetails = _.assign({}, member, _.pick(memberDetails, _.union(memberDetailFields, memberTraitFields)));
      return _(memberDetails).pick(fields).defaults(memberDefaults).value();
    });
  },

  /**
   * Retrieve member details from userIds
   */
  getUserRoles: Promise.coroutine(function* (userId, logger, requestId) { // eslint-disable-line func-names
    try {
      const token = yield this.getM2MToken();
      const httpClient = this.getHttpClient({ id: requestId, log: logger });
      return httpClient.get(`${config.identityServiceEndpoint}roles`, {
        params: {
          filter: `subjectID=${userId}`,
        },
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      }).then(res => _.get(res, 'data.result.content', [])
        .map(r => r.roleName));
    } catch (err) {
      return Promise.reject(err);
    }
  }),

  /**
  * Merge two JSON objects. For array fields, the target will be replaced by source.
  * @param {Object} targetObj the target object
  * @param {Object} sourceObj the source object
  * @param {Object} mergeExceptions list of keys which should be exempted from merge
  * @returns {Object} the merged object
  */
  mergeJsonObjects: (targetObj, sourceObj, mergeExceptions) =>
    // eslint-disable-next-line consistent-return
    _.mergeWith({}, targetObj, sourceObj, (target, source, key) => {
      // Overwrite the array or merge exception keys
      if (_.isArray(source) || (mergeExceptions && mergeExceptions.indexOf(key) !== -1)) {
        return source;
      }
    }),

  /**
     * Send resource to kafka bus
     * @param  {object} req  Request object
     * @param  {String} key  the event key
     * @param  {String} name  the resource name
     * @param  {object} resource  the resource
     * @param  {object} [originalResource] original resource in case resource was updated
     * @param  {String} [route] route which called the event (for phases and works)
     * @param  {Boolean}[skipNotification] if true, than event is not send to Notification Service
    */
    sendResourceToKafkaBus: Promise.coroutine(function* (req, key, name, resource, originalResource, route, skipNotification) {    // eslint-disable-line
    req.log.debug('Sending event to Kafka bus for resource %s %s', name, resource.id || resource.key);

    // emit event
    req.app.emit(key, {
      req,
      resource: _.assign({ resource: name }, resource),
      originalResource: originalResource ? _.assign({ resource: name }, originalResource) : undefined,
      route,
      skipNotification,
    });
  }),

  /**
   * Add userId to project
   * @param  {object} req  Request object that should contain project info and user info
   * @param  {object} member  the member to be added to project
   * @param  {sequalize.Transaction} transaction
  */
  addUserToProject: Promise.coroutine(function* (req, member, transaction) {    // eslint-disable-line
    const members = req.context.currentProjectMembers;

    // check if member is already registered
    const existingMember = _.find(members, m => m.userId === member.userId);
    if (existingMember) {
      const err = new Error(`User already registered for role: ${existingMember.role}`);
      err.status = 400;
      return Promise.reject(err);
    }

    req.log.debug('creating member', member);
    let newMember = null;
    // register member

    return models.ProjectMember.create(member, { transaction })
      .then((_newMember) => {
        newMember = _newMember.get({ plain: true });

        // we have to remove all pending invites for the member if any, as we can add a member directly without invite
        return models.ProjectMemberInvite.getPendingInviteByEmailOrUserId(member.projectId, null, newMember.userId)
          .then((invite) => {
            if (invite) {
              return invite.update({
                status: INVITE_STATUS.CANCELED,
              }, {
                transaction,
              });
            }

            return Promise.resolve();
          }).then(() => {
            // emit the event
            util.sendResourceToKafkaBus(
              req,
              EVENT.ROUTING_KEY.PROJECT_MEMBER_ADDED,
              RESOURCES.PROJECT_MEMBER,
              newMember);

            return newMember;
          });
      })
      .catch((err) => {
        req.log.error('Unable to register ', err);
        return Promise.reject(err);
      });
  }),

  /**
   * Lookup user handles from emails
   * @param {Object}  req        request
   * @param {Array}   userEmails user emails
   * @param {Boolean} isPattern  flag to indicate that pattern matching is required or not
   * @return {Promise} promise
   */
  lookupUserEmails: (req, userEmails, isPattern = false) => {
    req.log.debug(`identityServiceEndpoint: ${config.get('identityServiceEndpoint')}`);
    let filter = _.map(userEmails, i => `email=${i}`).join(' OR ');
    if (isPattern) {
      filter += '&like=true';
    }
    req.log.trace('filter for users api call', filter);
    return util.getM2MToken()
      .then((token) => {
        req.log.debug(`Bearer ${token}`);
        const httpClient = util.getHttpClient({ id: req.id, log: req.log });
        return httpClient.get(`${config.get('identityServiceEndpoint')}users`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          params: {
            fields: 'handle,id,email',
            filter,
          },
          // set longer timeout as default 3000 could be not enough for identity service response
          timeout: 15000,
        })
          .then((response) => {
            const data = _.get(response, 'data.result.content', null);
            if (!data) { throw new Error('Response does not have result.content'); }
            req.log.debug('UserHandle response', data);
            return data;
          });
      });
  },

  /**
   * Lookup user handles from multiple emails
   * @param {Object}  req        request
   * @param {Array}   userEmails user emails
   * @param {Number} maximumRequests  limit number of request on one batch
   * @param {Boolean} isPattern  flag to indicate that pattern matching is required or not
   * @return {Promise} promise
   */
  lookupMultipleUserEmails(req, userEmails, maximumRequests, isPattern = false) {
    req.log.debug(`identityServiceEndpoint: ${config.get('identityServiceEndpoint')}`);

    const httpClient = util.getHttpClient({ id: req.id, log: req.log });
    // request generator function
    const generateRequest = ({ token, email }) => {
      let filter = `email=${email}`;
      if (isPattern) {
        filter += '&like=true';
      }
      return httpClient.get(`${config.get('identityServiceEndpoint')}users`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        params: {
          fields: 'handle,id,email',
          filter,
        },
        // set longer timeout as default 3000 could be not enough for identity service response
        timeout: 15000,
      }).catch(() => {
        // in case of any error happens during getting user by email
        // we treat such users as not found and don't return error
        // as per discussion in issue #334
      });
    };
    // send batch of requests, one batch at one time
    const sendBatch = (options) => {
      const token = options.token;
      const emails = options.emails;
      const users = options.users || [];
      const batch = options.batch || 0;
      const start = batch * maximumRequests;
      const end = (batch + 1) * maximumRequests;
      const requests = emails.slice(start, end).map(userEmail =>
        generateRequest({ token, email: userEmail }));
      return Promise.all(requests)
        .then((responses) => {
          const data = responses.reduce((contents, response) => {
            const content = _.get(response, 'data.result.content', []);
            return _.concat(contents, content);
          }, users);
          req.log.debug(`UserHandle response batch-${batch}`, data);
          if (end < emails.length) {
            return sendBatch({ token, users: data, emails, batch: batch + 1 });
          }
          return data;
        });
    };
    return util.getM2MToken()
      .then((m2mToken) => {
        req.log.debug(`Bearer ${m2mToken}`);
        return sendBatch({ token: m2mToken, emails: userEmails });
      });
  },

  /**
   * Filter only members of topcoder team
   * @param {Array}  members        project members
   * @return {Array} tpcoder project members
   */
  getTopcoderProjectMembers: members => _(members).filter(m => m.role !== PROJECT_MEMBER_ROLE.CUSTOMER),

  /**
   * Check if project is for SSO users
   * @param {Object}  project        project
   * @return {Boolean} is SSO project
   */
  isSSO: project => ssoRefCodes.indexOf(_.get(project, 'details.utm.code')) > -1,

  /**
  * Set paginated header and respond with data
  * @param {Object} req HTTP request
  * @param {Object} res HTTP response
  * @param {Object} data Data for which pagination need to be applied
  * @return {Array} data rows to be returned
  */
  setPaginationHeaders: (req, res, data) => {
    const totalPages = Math.ceil(data.count / data.pageSize);
    let fullUrl = `${req.protocol}://${req.get('host')}${req.url.replace(`&page=${data.page}`, '')}`;
    // URL formatting to add pagination parameters accordingly
    if (fullUrl.indexOf('?') === -1) {
      fullUrl += '?';
    } else {
      fullUrl += '&';
    }

    // Pagination follows github style
    if (data.count > 0) { // Set Pagination headers only if there is data to paginate
      let link = ''; // Content for Link header

      // Set first and last page in Link header
      link += `<${fullUrl}page=1>; rel="first"`;
      link += `, <${fullUrl}page=${totalPages}>; rel="last"`;

      // Set Prev-Page only if it's not first page and within page limits
      if (data.page > 1 && data.page <= totalPages) {
        const prevPage = (data.page - 1);
        res.set({
          'X-Prev-Page': prevPage,
        });
        link += `, <${fullUrl}page=${prevPage}>; rel="prev"`;
      }

      // Set Next-Page only if it's not Last page and within page limits
      if (data.page < totalPages) {
        const nextPage = (_.parseInt(data.page) + 1);
        res.set({
          'X-Next-Page': (_.parseInt(data.page) + 1),
        });
        link += `, <${fullUrl}page=${nextPage}>; rel="next"`;
      }

      // Allow browsers access pagination data in headers
      let accessControlExposeHeaders = res.get('Access-Control-Expose-Headers') || '';
      accessControlExposeHeaders += accessControlExposeHeaders ? ', ' : '';
      accessControlExposeHeaders += 'X-Page, X-Per-Page, X-Total, X-Total-Pages';

      res.set({
        'Access-Control-Expose-Headers': accessControlExposeHeaders,
        'X-Page': data.page,
        'X-Per-Page': data.pageSize,
        'X-Total': data.count,
        'X-Total-Pages': totalPages,
        Link: link,
      });
    }
    // Return the data after setting pagination headers
    res.json(data.rows);
  },

  /**
   * Check if the following model exist
   * @param {Object} keyInfo key information, it includes version and key
   * @param {String} modelName name of model
   * @param {Object} model model that will be checked
   * @param {String} referredEntityName entity that referred by this model
   * @return {Promise} promise whether the record exists or not
   */
  checkModel: (keyInfo, modelName, model, referredEntityName) => {
    if (_.isNil(keyInfo)) {
      return Promise.resolve(null);
    }

    const { version, key } = keyInfo;
    let errorMessage = '';

    if (!_.isNil(version) && !_.isNil(key)) {
      errorMessage = `${modelName} with key ${key} and version ${version}`
        + ` referred in the ${referredEntityName} is not found`;
      return (model.findOne({
        where: {
          key,
          version,
        },
      })).then((record) => {
        if (_.isNil(record)) {
          const apiErr = new Error(errorMessage);
          apiErr.status = 400;
          throw apiErr;
        }
      });
    } else if (_.isNil(version) && !_.isNil(key)) {
      errorMessage = `${modelName} with key ${key}`
        + ` referred in ${referredEntityName} is not found`;
      return (model.findOne({
        where: {
          key,
        },
      })).then((record) => {
        if (_.isNil(record)) {
          const apiErr = new Error(errorMessage);
          apiErr.status = 400;
          throw apiErr;
        }
      });
    }

    return Promise.resolve(null);
  },

  /**
   * Check if user match the permission rule.
   *
   * This method uses permission rule defined in `permissionRule`
   * and checks that the `user` matches it.
   *
   * If we define a rule with `projectRoles` list, we also should provide `projectMembers`
   * - the list of project members.
   *
   * `permissionRule.projectRoles` may be equal to `true` which means user is a project member with any role
   *
   * `permissionRule.topcoderRoles` may be equal to `true` which means user is a logged-in user
   *
   * @param {Object}        permissionRule               permission rule
   * @param {Array<String>|Array<Object>|Boolean} permissionRule.projectRoles  the list of project roles of the user
   * @param {Array<String>|Boolean} permissionRule.topcoderRoles the list of Topcoder roles of the user
   * @param {Object}        user                         user for whom we check permissions
   * @param {Object}        user.roles                   list of user roles
   * @param {Object}        user.scopes                  scopes of user token
   * @param {Array}         projectMembers               (optional) list of project members - required to check `topcoderRoles`
   *
   * @returns {Boolean}     true, if has permission
   */
  matchPermissionRule: (permissionRule, user, projectMembers) => {
    let hasProjectRole = false;
    let hasTopcoderRole = false;
    let hasScope = false;

    // if no rule defined, no access by default
    if (!permissionRule) {
      return false;
    }

    // check Project Roles
    if (permissionRule.projectRoles && projectMembers) {
      const userId = !_.isNumber(user.userId) ? parseInt(user.userId, 10) : user.userId;
      const member = _.find(projectMembers, { userId });

      // check if user has one of allowed Project roles
      if (permissionRule.projectRoles.length > 0) {
        // as we support `projectRoles` as strings and as objects like:
        // { role: "...", isPrimary: true } we have normalize them to a common shape
        const normalizedProjectRoles = permissionRule.projectRoles.map(rule => (
          _.isString(rule) ? { role: rule } : rule
        ));

        hasProjectRole = member && _.some(normalizedProjectRoles, rule => (
          // checks that common properties are equal
          _.isMatch(member, rule)
        ));

      // `projectRoles === true` means that we check if user is a member of the project
      // with any role
      } else if (permissionRule.projectRoles === true) {
        hasProjectRole = !!member;
      }
    }

    // check Topcoder Roles
    if (permissionRule.topcoderRoles) {
      // check if user has one of allowed Topcoder roles
      if (permissionRule.topcoderRoles.length > 0) {
        hasTopcoderRole = _.intersection(
          _.get(user, 'roles', []).map(role => role.toLowerCase()),
          permissionRule.topcoderRoles.map(role => role.toLowerCase()),
        ).length > 0;

      // `topcoderRoles === true` means that we check if user is has any Topcoder role
      // basically this equals to logged-in user, as all the Topcoder users
      // have at least one role `Topcoder User`
      } else if (permissionRule.topcoderRoles === true) {
        hasTopcoderRole = _.get(user, 'roles', []).length > 0;
      }
    }

    // check M2M scopes
    if (permissionRule.scopes) {
      hasScope = _.intersection(
        _.get(user, 'scopes', []),
        permissionRule.scopes,
      ).length > 0;
    }

    return hasProjectRole || hasTopcoderRole || hasScope;
  },

  /**
   * Check if user has permission.
   *
   * This method uses permission defined in `permission` and checks that the `user` matches it.
   *
   * `permission` may be defined in two ways:
   *  - **Full** way with defined `allowRule` and optional `denyRule`, example:
   *    ```js
   *    {
   *       allowRule: {
   *          projectRoles: [],
   *          topcoderRoles: []
   *       },
   *       denyRule: {
   *          projectRoles: [],
   *          topcoderRoles: []
   *       }
   *    }
   *    ```
   *    If user matches `denyRule` then the access would be dined even if matches `allowRule`.
   *  - **Simplified** way may be used if we only want to define `allowRule`.
   *    We can skip the `allowRule` property and define `allowRule` directly inside `permission` object, example:
   *    ```js
   *    {
   *       projectRoles: [],
   *       topcoderRoles: []
   *    }
   *    ```
   *    This **simplified** permission is equal to a **full** permission:
   *    ```js
   *    {
   *       allowRule: {
   *         projectRoles: [],
   *         topcoderRoles: []
   *       }
   *    }
   *    ```
   *
   * If we define any rule with `projectRoles` list, we also should provide `projectMembers`
   * - the list of project members.
   *
   * @param {Object} permission     permission or permissionRule
   * @param {Object} user           user for whom we check permissions
   * @param {Object} user.roles     list of user roles
   * @param {Object} user.scopes    scopes of user token
   * @param {Array}  projectMembers (optional) list of project members - required to check `topcoderRoles`
   *
   * @returns {Boolean}     true, if has permission
   */
  hasPermission: (permission, user, projectMembers) => {
    if (!permission) {
      return false;
    }

    const allowRule = permission.allowRule ? permission.allowRule : permission;
    const denyRule = permission.denyRule ? permission.denyRule : null;

    const allow = util.matchPermissionRule(allowRule, user, projectMembers);
    const deny = util.matchPermissionRule(denyRule, user, projectMembers);

    // console.log('hasPermission', JSON.stringify({ permission, user, projectMembers, allow, deny }, null, 2));

    return allow && !deny;
  },

  hasPermissionByReq: (permission, req) => {
    // as it's very easy to forget "req" argument, throw error to make debugging easier
    if (!req) {
      throw new Error('Method "hasPermissionByReq" requires "req" argument.');
    }

    return util.hasPermission(permission, _.get(req, 'authUser'), _.get(req, 'context.currentProjectMembers'));
  },

  /**
   * Check if permission requires us to provide the list Project Members or no.
   *
   * @param {Object} permission     permission or permissionRule
   *
   * @return {Boolean} true if has permission
   */
  isPermissionRequireProjectMembers: (permission) => {
    if (!permission) {
      return false;
    }

    const allowRule = permission.allowRule ? permission.allowRule : permission;
    const denyRule = permission.denyRule ? permission.denyRule : null;

    const allowRuleRequiresProjectMembers = _.get(allowRule, 'projectRoles.length') > 0;
    const denyRuleRequiresProjectMembers = _.get(denyRule, 'projectRoles.length') > 0;

    return allowRuleRequiresProjectMembers || denyRuleRequiresProjectMembers;
  },

  /**
   * Check if user has permission for the project by `projectId`.
   *
   * This method uses permission defined in `permission` and checks that the `user` matches it.
   *
   * `permission` may be defined in two ways:
   *  - **Full** way with defined `allowRule` and optional `denyRule`, example:
   *    ```js
   *    {
   *       allowRule: {
   *          projectRoles: [],
   *          topcoderRoles: []
   *       },
   *       denyRule: {
   *          projectRoles: [],
   *          topcoderRoles: []
   *       }
   *    }
   *    ```
   *    If user matches `denyRule` then the access would be dined even if matches `allowRule`.
   *  - **Simplified** way may be used if we only want to define `allowRule`.
   *    We can skip the `allowRule` property and define `allowRule` directly inside `permission` object, example:
   *    ```js
   *    {
   *       projectRoles: [],
   *       topcoderRoles: []
   *    }
   *    ```
   *    This **simplified** permission is equal to a **full** permission:
   *    ```js
   *    {
   *       allowRule: {
   *         projectRoles: [],
   *         topcoderRoles: []
   *       }
   *    }
   *    ```
   *
   * @param {Object} permission     permission or permissionRule
   * @param {Object} user           user for whom we check permissions
   * @param {Object} user.roles     list of user roles
   * @param {Object} user.scopes    scopes of user token
   * @param {Number} projectId      project id to check permissions for
   *
   * @returns {Promise<Boolean>}     true, if has permission
   */
  hasPermissionForProject: (permission, user, projectId) => (
    models.ProjectMember.getActiveProjectMembers(projectId).then(projectMembers =>
      util.hasPermission(permission, user, projectMembers),
    )
  ),

  /**
   * Checks if the Project Setting represents price estimation setting
   *
   * @param {String} key project setting key
   *
   * @returns {Boolean} true it's project setting for price estimation
   */
  isProjectSettingForEstimation: (key) => {
    const markupMatch = key.match(/^markup_(.+)$/);
    const markupKey = markupMatch && markupMatch[1] ? markupMatch[1] : null;

    return markupKey ? _.includes(_.values(ESTIMATION_TYPE), markupKey) : false;
  },

  /**
   * Get default Project Role for a user by they Topcoder Roles.
   *
   * @param {Object} user       user
   * @param {Array}  user.roles user Topcoder roles
   *
   * @returns {String} project role
   */
  getDefaultProjectRole: (user) => {
    for (let i = 0; i < DEFAULT_PROJECT_ROLE.length; i += 1) {
      const rule = DEFAULT_PROJECT_ROLE[i];

      if (util.hasPermission({ topcoderRoles: [rule.topcoderRole] }, user)) {
        return rule.projectRole;
      }
    }

    return undefined;
  },

  /**
   * Validate if `fields` list has only allowed values from `allowedFields` or throws error.
   *
   * @param {Array} fields        fields to validate
   * @param {Array} allowedFields allowed fields
   *
   * @throws {Error}
   * @returns {void}
   */
  validateFields: (fields, allowedFields) => {
    if (!allowedFields) {
      throw new Error('List of "allowedFields" has to be provided.');
    }

    const disallowedFields = _.difference(fields, allowedFields);

    if (disallowedFields.length > 0) {
      const disallowedFieldsString = disallowedFields.map(field => `"${field}"`).join(', ');

      throw new Error(`values ${disallowedFieldsString} are not allowed`);
    }
  },
  /**
   * creates directory recursively.
   * NodeJS < 10.12.0 has no native support to create a directory recursively
   * So, we added this function. check this url for more details:
   * https://stackoverflow.com/questions/31645738/how-to-create-full-path-with-nodes-fs-mkdirsync
   * @param {string}    targetDir        directory path
   * @return {void}              Returns void
   */
  mkdirSyncRecursive: (targetDir) => {
    const sep = path.sep;
    const initDir = path.isAbsolute(targetDir) ? sep : '';
    const baseDir = __dirname;

    return targetDir.split(sep).reduce((parentDir, childDir) => {
      const curDir = path.resolve(baseDir, parentDir, childDir);
      try {
        fs.mkdirSync(curDir);
      } catch (err) {
        if (err.code === 'EEXIST') { // curDir already exists!
          return curDir;
        }

        // To avoid `EISDIR` error on Mac and `EACCES`-->`ENOENT` and `EPERM` on Windows.
        if (err.code === 'ENOENT') { // Throw the original parentDir error on curDir `ENOENT` failure.
          throw new Error(`EACCES: permission denied, mkdir '${parentDir}'`);
        }

        const caughtErr = ['EACCES', 'EPERM', 'EISDIR'].indexOf(err.code) > -1;
        if ((!caughtErr) || (caughtErr && curDir === path.resolve(targetDir))) {
          throw err; // Throw if it's just the last created dir.
        }
      }

      return curDir;
    }, initDir);
  },

  getScriptsLogger: () => {
    const appName = 'tc-projects-service';
    return coreLib.logger({
      name: appName,
      level: _.get(config, 'logLevel', 'debug').toLowerCase(),
      captureLogs: config.get('captureLogs'),
      logentriesToken: _.get(config, 'logentriesToken', null),
    });
  },

};

_.assignIn(util, projectServiceUtils);

export default util;
