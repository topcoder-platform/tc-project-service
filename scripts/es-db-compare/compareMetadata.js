/* eslint-disable no-console */
/* eslint-disable consistent-return */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-param-reassign */
/*
 * Compare metadata between ES and DB.
 */
const lodash = require('lodash');

const scriptUtil = require('./util');
const scriptConstants = require('./constants');

const hashKeyMapping = {
  ProjectTemplate: 'id',
  ProductTemplate: 'id',
  ProjectType: 'key',
  ProductCategory: 'key',
  MilestoneTemplate: 'id',
  OrgConfig: 'id',
  Form: 'id',
  PlanConfig: 'id',
  PriceConfig: 'id',
  BuildingBlock: 'id',
};

/**
 * Process a single delta.
 *
 * @param {String} modelName the model name the delta belongs to
 * @param {Object} delta the diff delta.
 * @param {Object} dbData the data from DB
 * @param {Object} esData the data from ES
 * @param {Object} finalData the data patched
 * @returns {undefined}
 */
function processDelta(modelName, delta, dbData, esData, finalData) {
  const hashKey = hashKeyMapping[modelName];
  if (delta.dataType === 'array' && delta.path.length === 1) {
    if (delta.type === 'delete') {
      console.log(`one dbOnly found for ${modelName} with ${hashKey} ${delta.originalValue[hashKey]}`);
      return {
        type: 'dbOnly',
        modelName,
        hashKey,
        hashValue: delta.originalValue[hashKey],
        dbCopy: delta.originalValue,
      };
    }
    if (delta.type === 'add') {
      console.log(`one esOnly found for ${modelName} with ${hashKey} ${delta.value[hashKey]}`);
      return {
        type: 'esOnly',
        modelName,
        hashKey,
        hashValue: delta.value[hashKey],
        esCopy: delta.value,
      };
    }
  }
  if (['add', 'delete', 'modify'].includes(delta.type)) {
    const path = scriptUtil.generateJSONPath(lodash.slice(delta.path, 1));
    const hashValue = lodash.get(finalData, lodash.slice(delta.path, 0, 1))[hashKey];
    const hashObject = lodash.set({}, hashKey, hashValue);
    const dbCopy = lodash.find(dbData, hashObject);
    const esCopy = lodash.find(esData, hashObject);
    console.log(`one mismatch found for ${modelName} with ${hashKey} ${hashValue}`);
    return {
      type: 'mismatch',
      kind: delta.type,
      modelName,
      hashKey,
      hashValue,
      path,
      dbCopy,
      esCopy,
    };
  }
}


/**
 * Compare Metadata data from ES and DB.
 *
 * @param {Object} dbData the data from DB
 * @param {Object} esData the data from ES
 * @returns {Object} the data to feed handlebars template
 */
function compareMetadata(dbData, esData) {
  const data = {
    nestedModels: {},
  };

  const countInconsistencies = () => {
    lodash.set(data, 'meta.totalObjects', 0);
    lodash.map(data.nestedModels, (model) => {
      const counts = Object.keys(model.mismatches).length + model.dbOnly.length + model.esOnly.length;
      lodash.set(model, 'meta.counts', counts);
      data.meta.totalObjects += counts;
    });
  };

  const storeDelta = (modelName, delta) => {
    if (lodash.isUndefined(data.nestedModels[modelName])) {
      data.nestedModels[modelName] = {
        mismatches: {},
        dbOnly: [],
        esOnly: [],
      };
    }
    if (delta.type === 'mismatch') {
      if (lodash.isUndefined(data.nestedModels[modelName].mismatches[delta.hashValue])) {
        data.nestedModels[modelName].mismatches[delta.hashValue] = [];
      }
      data.nestedModels[modelName].mismatches[delta.hashValue].push(delta);
      return;
    }
    if (delta.type === 'dbOnly') {
      data.nestedModels[modelName].dbOnly.push(delta);
      return;
    }
    if (delta.type === 'esOnly') {
      data.nestedModels[modelName].esOnly.push(delta);
    }
  };

  for (const refPath of Object.keys(scriptConstants.associations.metadata)) {
    const modelName = scriptConstants.associations.metadata[refPath];
    const { deltas, finalData } = scriptUtil.diffData(
      dbData[refPath],
      esData[refPath],
      {
        hashKey: hashKeyMapping[modelName],
        modelPathExprssions: lodash.set({}, modelName, '[*]'),
      },
    );
    for (const delta of deltas) {
      if (scriptUtil.isIgnoredPath(`metadata.${refPath}`, delta.path)) {
        continue; // eslint-disable-line no-continue
      }
      const deltaWithCopy = processDelta(modelName, delta, dbData[refPath], esData[refPath], finalData);
      if (deltaWithCopy) {
        storeDelta(modelName, deltaWithCopy);
      }
    }
  }
  countInconsistencies();
  return data;
}

module.exports = {
  compareMetadata,
};
