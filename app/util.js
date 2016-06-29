/*
 * Copyright (C) 2016 TopCoder Inc., All Rights Reserved.
 */
/**
 * This is utils file.
 * @author TCDEVELOPER
 * @version 1.0
 */
'use strict'

var _ = require('lodash'),
  querystring = require('querystring'),
  config = require('config')

var util = _.cloneDeep(require('tc-core-library-js').util(config))
_.assignIn(util, {
  /**
   * Handle error
   * @param defaultMessage the default error message
   * @param err the err
   * @param next the next function
   * @returns next function with error
   */
  handleError: (msg, err, req, next) => {
    req.log.error({
      message: msg,
      error: err
    })
    let apiErr = new Error(msg)
    let details = err.details || msg
    _.assign(apiErr, {
      status: _.get(err, 'status', 500),
      details: _.get(err, 'details', msg)
    })
    return next(apiErr)
  },
  /**
   * Validates if filters are valid
   * @param  {object} filters    object with filters
   * @param  {array} validValues valid filter values
   * @return {boolean}
   */
  isValidFilter: (filters, validValues) => {
    var valid = true
    _.each(_.keys(filters), (k) => {
      if (valid && _.indexOf(validValues, k) < 0) {
        valid = false
      }
    })
    return valid
  },
  /**
   * Helper funtion to verify if user has specified role
   * @param  {object} req  Request object that should contain authUser
   * @param  {string} role specified role
   * @return {boolean}      true/false
   */
  hasRole: (req, role) => {
    let roles = _.get(req, 'authUser.roles', [])
    roles = roles.map(s => s.toLowerCase())
    return _.indexOf(roles, role.toLowerCase()) >= 0
  },

  /**
   * Parses query fields and groups them per table
   * @param  {array} queryFields list of query fields
   * @return {object}
   */
  parseFields: (queryFields, allowedFields) => {
    var fields = _.cloneDeep(allowedFields)
    if (queryFields.length) {
      // remove any inavlid fields
      fields['projects'] = _.intersection(queryFields, allowedFields['projects'])
      fields['project_members'] = _.filter(queryFields, (f) => { return f.indexOf('members.') === 0})
      // remove members. prefix
      fields['project_members'] = _.map(fields['project_members'], (f) => { return f.substring(8) })
      // remove any errorneous fields
      fields['project_members'] = _.intersection(fields['project_members'], allowedFields['project_members'])
      if (fields['project_members'].length === 0 && _.indexOf(queryFields, 'members') > -1) {
        fields['project_members'] = allowedFields['project_members']
      }
    }
    return fields
  },

  parseQueryFilter: (queryFilter) => {
    queryFilter = querystring.parse(queryFilter)
    // convert in to array
    queryFilter = _.mapValues(queryFilter, (val) => {
      if (val.indexOf('in(') > -1) {
        return { $in: val.substring(3, val.length-1).split(',') }
      }
      return val
    })
    if (queryFilter.id) {
      queryFilter.id['$in'] = _.map(queryFilter.id['$in'], _.parseInt)
    }
    return queryFilter
  }

})

module.exports = util
