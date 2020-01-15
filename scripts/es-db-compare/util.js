/* eslint-disable no-underscore-dangle */
/* eslint-disable no-use-before-define */
/* eslint-disable no-restricted-syntax */
/*
 * Util functions used in the script.
 */

const _ = require('lodash');
const moment = require('moment');

const constants = require('./constants');

/**
 * Sub-function for the flatten function that process object assets in the delta.
 *
 * @param {Object} delta the diff delta
 * @param {Array} path the JSON path
 * @returns {Array} flattened delta
 */
function flattenObject(delta, path) {
  let result = [];
  _.map(delta, (value, key) => {
    const currentPath = _.concat(path, key);
    if (value instanceof Array) {
      if (value.length === 2) {
        result.push({
          path: currentPath,
          type: 'modify',
          dataType: 'object',
          originalValue: value[0],
          currentValue: value[1],
        });
        return;
      }
      if (value.length === 1) {
        result.push({
          path: currentPath,
          type: 'add',
          dataType: 'object',
          value: value[0],
        });
        return;
      }
      if (value.length === 3) {
        if (value[2] === 3) {
          result.push({
            path: currentPath,
            type: 'move',
            dataType: 'object',
            value: value[0],
          });
          return;
        }
        result.push({
          path: currentPath,
          type: 'delete',
          dataType: 'object',
          value: value[0],
        });
        return;
      }
    }
    result = _.concat(result, flatten(value, _.clone(currentPath)));
  });
  return result;
}

/**
 * Sub-function for the flatten function that process array assets in the delta.
 *
 * @param {Object} delta the diff delta
 * @param {Array} path the JSON path
 * @returns {Array} flattened delta
 */
function flattenArray(delta, path) {
  let result = [];
  _.map(_.omit(delta, ['_t']), (value, key) => {
    if (value instanceof Array) {
      if (key.startsWith('_')) {
        const index = key.substring(1);
        const currentPath = [...path, index];
        if (value[2] === 3) {
          result.push({
            path: currentPath,
            type: 'move',
            dataType: 'array',
            index,
            originalValue: value[0],
          });
          return;
        }
        result.push({
          path: currentPath,
          type: 'delete',
          dataType: 'array',
          index,
          originalValue: value[0],
        });
        return;
      }
      const currentPath = _.concat(path, key);
      if (value[2] === 3) {
        result.push({
          path: currentPath,
          type: 'move',
          dataType: 'array',
          index: key,
          value: value[0],
        });
        return;
      }
      result.push({
        path: currentPath,
        type: 'add',
        dataType: 'array',
        index: key,
        value: value[0],
      });
      return;
    }
    const currentPath = _.concat(path, key);
    if (key >= 0) {
      result = _.concat(result, flattenObject(value, _.clone(currentPath)));
      return;
    }
    throw new Error(`Unhandled case at ${currentPath}`);
  });
  return result;
}

/**
 * Flatten delta from json diff patch so that it can be easily manipulated.
 *
 * @param {Object} delta the diff delta
 * @param {Array} path the JSON path
 * @returns {Array} flattened delta
 */
function flatten(delta, path = []) {
  if (delta._t === 'a') {
    return flattenArray(delta, path);
  }
  return flattenObject(delta, path);
}

/**
 * Generate a JSON path from array format.
 * Example: `generateJSONPath([ 'members', '0', 'key' ])` will output `members[0].key`
 *
 * @param {Array} path path in array format
 * @returns {String} the JSON path
 */
function generateJSONPath(path) {
  let result = '';
  for (const item of path) {
    if (!isNaN(item)) {
      result += `[${item}]`;
      continue; // eslint-disable-line no-continue
    }
    if (result) {
      result += '.';
    }
    result += item;
  }
  return result;
}

/**
 * Check if the json path of a delta should be ignored.
 * Low-budget version.
 *
 * @param {String} root the model name, one of "project" and "metadata"
 * @param {Array} path the path to be verified
 * @returns {Boolean} the result
 */
function isIgnoredPath(root, path) {
  const jsonPath = generateJSONPath(_.slice(path, 1));
  if (jsonPath === '') {
    return false;
  }
  const expr = jsonPath.replace(/\[\d+\]/g, '[*]').replace(/^/, `${root}.`)
  if (constants.ignoredPaths.includes(expr)) {
    return true;
  }
  return false;
}

/**
 * Generate a sensible filename for the report.
 *
 * @returns {String} the result filename
 */
function generateFilename() {
  const nodeEnv = process.env.NODE_ENV || 'default';
  const date = moment().format('DD-MM-YYYY-HH-MM-SS');
  return `es-db-report-${nodeEnv}-${date}.html`;
}

module.exports = {
  flatten,
  generateJSONPath,
  generateFilename,
  isIgnoredPath,
};
