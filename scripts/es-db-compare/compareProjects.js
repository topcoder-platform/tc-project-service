/* eslint-disable no-console */
/* eslint-disable consistent-return */
/* eslint-disable no-restricted-syntax */
/*
 * Compare the data from database and data from ES.
 * Specific to project-related data.
 *
 * Please consider decouple some reusable logics from this module before create
 * modules to compare other models.
 */

const Diff = require('jsondiffpatch');
const lodash = require('lodash');
const scriptUtil = require('./util');
const scriptConstants = require('./constants');

const associations = {
  phases: 'Phase',
  members: 'Member',
  invites: 'Invite',
  attachment: 'Attachment',
};

const differ = Diff.create({
  objectHash: obj => obj.id,
  propertyFilter: (name) => {
    if (scriptConstants.ignoredProperties.includes(name)) {
      return false;
    }
    return true;
  },
});

/**
 * Process diff delta to extract project-related data.
 *
 * @param {Object} delta the diff delta. See `util.flatten()`
 * @param {Object} esData the data from ES
 * @param {Object} dbData the data from DB
 * @param {Object} finalData the data patched
 * @returns {Object} Object project diff delta in a specific data structure
 */
function processDelta(delta, esData, dbData, finalData) {
  const processMissingObject = (item, option) => {
    if (item.type === 'delete') {
      const projectId = lodash.get(dbData, lodash.slice(item.path, 0, 1)).id;
      console.log(`one dbOnly found for ${option.modelName} with id ${item.originalValue.id}`);
      return {
        type: 'dbOnly',
        projectId,
        modelName: option.modelName,
        id: item.originalValue.id,
        dbCopy: item.originalValue,
      };
    }
    if (item.type === 'add') {
      const projectId = lodash.get(esData, lodash.slice(item.path, 0, 1)).id;
      console.log(`one esOnly found for ${option.modelName} with id ${item.value.id}`);
      return {
        type: 'esOnly',
        projectId,
        modelName: option.modelName,
        id: item.value.id,
        esCopy: item.value,
      };
    }
  };

  const processProduct = (item) => {
    const itemNew = Object.assign({}, lodash.omit(item, ['path']), { path: lodash.slice(item.path, 5) });
    if (itemNew.dataType === 'array') {
      return processMissingObject(item, { modelName: 'Product' });
    }
    if (['add', 'delete', 'modify'].includes(itemNew.type)) {
      const path = scriptUtil.generateJSONPath(itemNew.path);
      const id = lodash.get(finalData, lodash.slice(item.path, 0, 5)).id;
      const projectId = lodash.get(finalData, lodash.slice(item.path, 0, 1)).id;
      const phaseId = lodash.get(finalData, lodash.slice(item.path, 0, 3)).id;
      const dbCopy = lodash.find(
        lodash.find(
          lodash.find(dbData, { id: projectId }).phases,
          { id: phaseId },
        ).products,
        { id },
      );
      const esCopy = lodash.find(
        lodash.find(
          lodash.find(esData, { id: projectId }).phases,
          { id: phaseId },
        ).products,
        { id },
      );
      console.log(`one mismatch found for Product with id ${id}`);
      return {
        type: 'mismatch',
        projectId,
        id,
        modelName: 'Product',
        path,
        dbCopy,
        esCopy,
      };
    }
  };

  const processAssociation = (item, option) => {
    if (item.path[1] === 'phases' && item.path[3] === 'products') {
      return processProduct(item);
    }
    const itemNew = Object.assign({}, lodash.omit(item, ['path']), { path: lodash.slice(item.path, 2) });
    if (itemNew.dataType === 'array') {
      return processMissingObject(item, option);
    }
    if (['add', 'delete', 'modify'].includes(itemNew.type)) {
      const path = scriptUtil.generateJSONPath(lodash.slice(itemNew.path, 1));
      const id = lodash.get(finalData, lodash.slice(item.path, 0, 3)).id;
      const projectId = lodash.get(finalData, lodash.slice(item.path, 0, 1)).id;
      const dbCopy = lodash.find(
        lodash.find(dbData, { id: projectId })[option.refPath],
        { id },
      );
      const esCopy = lodash.find(
        lodash.find(esData, { id: projectId })[option.refPath],
        { id },
      );
      console.log(`one mismatch found for ${option.modelName} with id ${id}`);
      return {
        type: 'mismatch',
        projectId,
        modelName: option.modelName,
        id,
        path,
        dbCopy,
        esCopy,
      };
    }
  };

  if (delta.path.length > 2 && associations[delta.path[1]]) {
    return processAssociation(delta, { modelName: associations[delta.path[1]], refPath: delta.path[1] });
  }
  if (delta.dataType === 'array') {
    return processMissingObject(delta, { modelName: 'Project' });
  }
  if (['add', 'delete', 'modify'].includes(delta.type)) {
    const path = scriptUtil.generateJSONPath(lodash.slice(delta.path, 1));
    const id = lodash.get(finalData, lodash.slice(delta.path, 0, 1)).id;
    const dbCopy = lodash.find(dbData, { id });
    const esCopy = lodash.find(esData, { id });
    console.log(`one mismatch found for Project with id ${id}`);
    return {
      type: 'mismatch',
      projectId: id,
      modelName: 'Project',
      id,
      path,
      dbCopy,
      esCopy,
    };
  }
}

/**
 * Compare Project data from ES and DB.
 *
 * @param {Object} esData the data from ES
 * @param {Object} dbData the data from DB
 * @returns {Object} the data to feed handlebars template
 */
function compareProjects(esData, dbData) {
  const data = {
    project: {
      rootMismatch: {},
      esOnly: [],
      dbOnly: [],
    },
    meta: {
      esCopies: [],
      dbCopies: [],
      counts: {
        Project: 0,
      },
      uniqueDeltas: [],
    },
  };

  const storeDelta = (root, delta) => {
    if (delta.modelName === 'Project') {
      if (delta.type === 'esOnly') {
        data[root].esOnly.push(delta);
        return;
      }
      if (delta.type === 'dbOnly') {
        data[root].dbOnly.push(delta);
        return;
      }
    }
    if (!data[root].rootMismatch[delta.projectId]) {
      data[root].rootMismatch[delta.projectId] = { project: [], associations: {} };
    }
    if (delta.modelName === 'Project') {
      data[root].rootMismatch[delta.projectId].project.push(delta);
      return;
    }
    const currentAssociations = data[root].rootMismatch[delta.projectId].associations;
    if (!Object.keys(currentAssociations).includes(delta.modelName)) {
      currentAssociations[delta.modelName] = {
        mismatches: {},
        esOnly: [],
        dbOnly: [],
      };
    }
    if (delta.type === 'mismatch') {
      const mismatches = currentAssociations[delta.modelName].mismatches;
      if (!mismatches[delta.id]) {
        mismatches[delta.id] = [];
      }
      mismatches[delta.id].push(delta);
      return;
    }
    currentAssociations[delta.modelName][delta.type].push(delta);
  };

  const collectDataCopies = (delta) => {
    if (delta.dbCopy) {
      if (!lodash.find(data.meta.dbCopies, lodash.pick(delta, ['modelName', 'id']))) {
        data.meta.dbCopies.push(delta);
      }
    }
    if (delta.esCopy) {
      if (!lodash.find(data.meta.esCopies, lodash.pick(delta, ['modelName', 'id']))) {
        data.meta.esCopies.push(delta);
      }
    }
  };

  const countInconsistencies = () => {
    lodash.set(
      data.project,
      'meta.totalObjects',
      data.project.dbOnly.length + data.project.esOnly.length,
    );
    lodash.set(
      data.project,
      'meta.totalProjects',
      Object.keys(data.project.rootMismatch).length + data.project.dbOnly.length + data.project.esOnly.length,
    );
    lodash.map(data.project.rootMismatch, (value) => {
      const currentValue = value;
      lodash.set(currentValue, 'meta.counts', currentValue.project.length ? 1 : 0);
      lodash.map(currentValue.associations, (subObject) => {
        lodash.set(
          subObject,
          'meta.counts',
          Object.keys(subObject.mismatches).length + subObject.dbOnly.length + subObject.esOnly.length,
        );
        currentValue.meta.counts += subObject.meta.counts;
      });
      data.project.meta.totalObjects += currentValue.meta.counts;
    });
  };

  const result = differ.diff(dbData, esData);
  const finalData = differ.patch(Diff.clone(dbData), result);
  const flattenedResult = scriptUtil.flatten(result);
  for (const item of flattenedResult) {
    const delta = processDelta(item, esData, dbData, finalData);
    if (delta) {
      collectDataCopies(delta);
      storeDelta('project', delta);
    }
  }
  countInconsistencies();
  return data;
}

module.exports = {
  compareProjects,
};
