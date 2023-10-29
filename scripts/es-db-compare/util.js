/* eslint-disable no-underscore-dangle */
/* eslint-disable no-use-before-define */
/* eslint-disable no-restricted-syntax */
/*
 * Util functions used in the script.
 */

const _ = require('lodash');
const moment = require('moment');

const constants = require('./constants');
const Diff = require('jsondiffpatch');

/**
 * Get jsondiffpatch instance
 *
 * @param {Object} config additional config
 * @returns {Object} the instance
 */
function getDiffer(config) {
  const differ = Diff.create({
    objectHash: (obj) => {
      if (!_.isUndefined(obj[config.hashKey])) {
        return obj[config.hashKey];
      }
      if (typeof obj === 'object') { // object or array
        return obj.toString();
      }
      return undefined;
    },
  });
  return differ;
}

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
    result = _.concat(result, flattenDeltas(value, _.clone(currentPath)));
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
      result = _.concat(result, flattenDeltas(value, _.clone(currentPath)));
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
function flattenDeltas(delta, path = []) {
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
 * Generate a sensible filename for the report.
 *
 * @returns {String} the result filename
 */
function generateFilename() {
  const nodeEnv = process.env.NODE_ENV || 'default';
  const date = moment().format('DD-MM-YYYY-HH-MM-SS');
  return `es-db-report-${nodeEnv}-${date}.html`;
}

/**
 * Check if a json path matches a json path expression.
 *
 * @param {Array} path the path to be verified
 * @param {Array} pathExprs a list of json path expressions
 * @returns {Boolean} the result
 */
function pathMatches(path, pathExprs) {
  const jsonPath = generateJSONPath(path);
  const expr = jsonPath.replace(/\[\d+\]/g, '[*]');
  return pathExprs.includes(expr);
}

/**
 * Check if the json path of a diff delta should be ignored.
 *
 * @param {String} root the path prefix
 * @param {Array} path the path to be verified
 * @returns {Boolean} the result
 */
function isIgnoredPath(root, path) {
  const pathWithPrefix = _.concat([root], _.slice(path, 1));
  return pathMatches(pathWithPrefix, constants.ignoredPaths);
}

/**
 * The json diff patch could contain deltas with same path at an index of an array,
 * one is "added to the array", the other is "deleted from the array".
 * In such case, if the path is not related to a model,
 * they can be combined and treated as "modified at the index in the array".
 *
 * @param {Array} deltas the diff deltas to be filtered
 * @param {Object} config additional config
 * @returns {Array} the result deltas
 */
function processArrayDelta(deltas, config) {
  const result = [];
  const groups = _.groupBy(deltas, 'path');
  _.map(groups, (group) => {
    if (group.length === 1) {
      result.push(group[0]);
      return;
    }
    if (group.length === 2) {
      if (pathMatches(group[0].path, Object.values(config.modelPathExprssions))) {
        result.push(group[0], group[1]);
        return;
      }
      result.push(Object.assign({ type: 'modify' }, _.omit(group[0], 'type')));
      return;
    }
    throw new Error('Internal Error');
  });
  return result;
}

/**
 * compare two set of data and generate diff deltas.
 *
 * @param {Array} left the origin data
 * @param {Array} right the comparand data
 * @param {Object} config additional config
 * @returns {Object} the deltas
 */
function diffData(left, right, config = { hashKey: 'id' }) {
  const differ = getDiffer(config);
  const deltas = differ.diff(left, right);
  if (!deltas) {
    return { deltas: [] };
  }
  const finalData = differ.patch(Diff.clone(left), deltas);
  const flattenedDeltas = processArrayDelta(flattenDeltas(deltas), config);
  return {
    deltas: flattenedDeltas,
    finalData,
  };
}

module.exports = {
  generateJSONPath,
  generateFilename,
  isIgnoredPath,
  diffData,
};
