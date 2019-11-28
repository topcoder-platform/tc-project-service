
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
import models from './models';
// import AWS from 'aws-sdk';

import { ADMIN_ROLES, TOKEN_SCOPES, EVENT, PROJECT_MEMBER_ROLE, VALUE_TYPE, ESTIMATION_TYPE } from './constants';

const exec = require('child_process').exec;
const tcCoreLibAuth = require('tc-core-library-js').auth;

const m2m = tcCoreLibAuth.m2m(config);

const util = _.cloneDeep(require('tc-core-library-js').util(config));

const ssoRefCodes = JSON.parse(config.get('SSO_REFCODES'));

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
      // remove attachments if not requested
      if (fields.attachments && _.indexOf(queryFields, 'attachments') === -1) {
        fields.attachments = null;
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
    if (queryFilter.id && queryFilter.id.$in) {
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
    return esClient;
  },

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
   * Filter member details by input fields
   *
   * @param {Array}   members   Array of member detail objects
   * @param {Array}   fields    Array of fields to be used to filter member objects
   * @param {Object}  opts      logger & request id
   *
   * @return {Array}            Filtered array of member detail objects
   */
  getObjectsWithMemberDetails: async (members, fields, opts) => {
    if (!fields || _.isEmpty(fields)) {
      return members;
    }
    const { logger, requestId, memberFields } = opts;
    const requestedNonMemberFields = _.filter(fields, field => !_.includes(memberFields, field));
    const otherMemberFields = ['photoURL', 'workingHoursStart', 'workingHoursEnd', 'timeZone'];

    let allMemberDetails = [];
    if (requestedNonMemberFields.length > 0) {
      const userIds = _.map(members, 'userId');
      allMemberDetails = await util.getMemberDetailsByUserIds(userIds, logger, requestId);

      if (_.intersection(requestedNonMemberFields, otherMemberFields).length > 0) {
        const promises = _.map(
          allMemberDetails,
          member => util.getMemberTraitsByHandle(member.handle, logger, requestId),
        );
        const traits = await Promise.all(promises);
        for (let i = 0; i < allMemberDetails.length; i += 1) {
          const member = allMemberDetails[i];
          const data = _.find(traits, trait => trait.handle === member.handle);
          const basicInfo = _.find(data, infoItem => infoItem.traitId === 'basic_info');
          const connectInfo = _.find(data, infoItem => infoItem.traitId === 'connect_info');
          const photoUrl = _.get(basicInfo, 'traits.data[0].photoURL', null);
          const memberTraits = _.assign({}, { photoUrl }, _.pick(
            _.get(connectInfo, 'traits.data.0'),
            'workingHourStart', 'workingHourEnd', 'timeZone',
          ));
          allMemberDetails[i] = _.assign({}, member, memberTraits);
        }
      }
    }

    const memberDefaults = _.assign(...fields.map(field => ({ [field]: null })));

    return _.map(members, (member) => {
      let memberDetails = _.find(allMemberDetails, ({ userId }) => userId === member.userId);
      memberDetails = _.assign({}, member, memberDetails);
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
   * Add userId to project
   * @param  {object} req  Request object that should contain project info and user info
   * @param  {object} member  the member to be added to project
  */
  addUserToProject: Promise.coroutine(function* (req, member) {    // eslint-disable-line
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
    return models.ProjectMember.create(member)
    .then((_newMember) => {
      newMember = _newMember.get({ plain: true });
      // publish event
      req.app.services.pubsub.publish(
        EVENT.ROUTING_KEY.PROJECT_MEMBER_ADDED,
        newMember,
        { correlationId: req.id },
      );
      req.app.emit(EVENT.ROUTING_KEY.PROJECT_MEMBER_ADDED, { req, member: newMember });
      return newMember;
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
          apiErr.status = 422;
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
          apiErr.status = 422;
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
   * @param {Object}        permissionRule               permission rule
   * @param {Array<String>} permissionRule.projectRoles  the list of project roles of the user
   * @param {Array<String>} permissionRule.topcoderRoles the list of Topcoder roles of the user
   * @param {Object}        user                         user for whom we check permissions
   * @param {Object}        user.roles                   list of user roles
   * @param {Object}        user.isMachine               `true` - if it's machine, `false` - real user
   * @param {Object}        user.scopes                  scopes of user token
   * @param {Array}         projectMembers               (optional) list of project members - required to check `topcoderRoles`
   *
   * @returns {Boolean}     true, if has permission
   */
  matchPermissionRule: (permissionRule, user, projectMembers) => {
    const member = _.find(projectMembers, { userId: user.userId });
    let hasProjectRole = false;
    let hasTopcoderRole = false;

    if (permissionRule) {
      if (permissionRule.projectRoles
        && permissionRule.projectRoles.length > 0
        && !!member
      ) {
        hasProjectRole = _.includes(permissionRule.projectRoles, member.role);
      }

      if (permissionRule.topcoderRoles && permissionRule.topcoderRoles.length > 0) {
        hasTopcoderRole = util.hasRoles({ authUser: user }, permissionRule.topcoderRoles);
      }
    }

    return hasProjectRole || hasTopcoderRole;
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
   * @param {Object} user.isMachine `true` - if it's machine, `false` - real user
   * @param {Object} user.scopes    scopes of user token
   * @param {Array}  projectMembers (optional) list of project members - required to check `topcoderRoles`
   *
   * @returns {Boolean}     true, if has permission
   */
  hasPermission: (permission, user, projectMembers) => {
    const allowRule = permission.allowRule ? permission.allowRule : permission;
    const denyRule = permission.denyRule ? permission.denyRule : null;

    const allow = util.matchPermissionRule(allowRule, user, projectMembers);
    const deny = util.matchPermissionRule(denyRule, user, projectMembers);

    return allow && !deny;
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
   * @param {Object} user.isMachine `true` - if it's machine, `false` - real user
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
});

export default util;
