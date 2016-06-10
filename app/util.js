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
  }
})

module.exports = util
