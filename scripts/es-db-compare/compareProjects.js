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

const lodash = require('lodash');
const scriptUtil = require('./util');
const scriptConstants = require('./constants');

/**
 * Process diff delta to extract project-related data.
 *
 * @param {Object} delta the diff delta.
 * @param {Object} dbData the data from DB
 * @param {Object} esData the data from ES
 * @param {Object} finalData the data patched
 * @returns {Object} Object project diff delta in a specific data structure
 */
function processDelta(delta, dbData, esData, finalData) {
  const processMissingObject = (item, option) => {
    if (item.type === 'delete') {
      const projectId = lodash.get(finalData, lodash.slice(item.path, 0, 1)).id;
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
      const projectId = lodash.get(finalData, lodash.slice(item.path, 0, 1)).id;
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

  const processMilestone = (item) => {
    const subPath = lodash.slice(item.path, 7);
    if (item.dataType === 'array' && subPath.length === 1) {
      return processMissingObject(item, { modelName: 'Milestone' });
    }
    if (['add', 'delete', 'modify'].includes(item.type)) {
      const path = scriptUtil.generateJSONPath(lodash.slice(subPath, 1));
      const id = lodash.get(finalData, lodash.slice(item.path, 0, 8)).id;
      const projectId = lodash.get(finalData, lodash.slice(item.path, 0, 1)).id;
      const phaseId = lodash.get(finalData, lodash.slice(item.path, 0, 3)).id;
      const productId = lodash.get(finalData, lodash.slice(item.path, 0, 5)).id;
      const dbCopy = lodash.find(
        lodash.find(
          lodash.find(
            lodash.find(dbData, { id: projectId }).phases,
            { id: phaseId },
          ).products,
          { id: productId },
        ).timeline.milestones,
        { id },
      );
      const esCopy = lodash.find(
        lodash.find(
          lodash.find(
            lodash.find(esData, { id: projectId }).phases,
            { id: phaseId },
          ).products,
          { id: productId },
        ).timeline.milestones,
        { id },
      );
      console.log(`one mismatch found for Milestone with id ${id}`);
      return {
        type: 'mismatch',
        kind: item.type,
        dataType: item.dataType,
        projectId,
        id,
        modelName: 'Milestone',
        path,
        dbCopy,
        esCopy,
      };
    }
  };

  const processTimeline = (item) => {
    if (item.path.length === 6 && item.type === 'modify') {
      if (lodash.isNil(item.originalValue)) {
        console.log(`one esOnly found for Timeline with id ${item.currentValue.id}`);
        return {
          type: 'esOnly',
          projectId: lodash.get(finalData, lodash.slice(item.path, 0, 1)).id,
          modelName: 'Timeline',
          id: item.currentValue.id,
          esCopy: item.currentValue,
        };
      }
      if (lodash.isNil(item.currentValue)) {
        console.log(`one dbOnly found for Timeline with id ${item.originalValue.id}`);
        return {
          type: 'dbOnly',
          projectId: lodash.get(finalData, lodash.slice(item.path, 0, 1)).id,
          modelName: 'Timeline',
          id: item.originalValue.id,
          dbCopy: item.originalValue,
        };
      }
      throw new Error('Internal Error');
    }
    const subPath = lodash.slice(item.path, 4);
    if (['add', 'delete', 'modify'].includes(item.type)) {
      const path = scriptUtil.generateJSONPath(lodash.slice(subPath, 2));
      const id = lodash.get(finalData, lodash.slice(item.path, 0, 5)).timeline.id;
      const projectId = lodash.get(finalData, lodash.slice(item.path, 0, 1)).id;
      const phaseId = lodash.get(finalData, lodash.slice(item.path, 0, 3)).id;
      const productId = lodash.get(finalData, lodash.slice(item.path, 0, 5)).id;
      const dbCopy = lodash.find(
        lodash.find(
          lodash.find(dbData, { id: projectId }).phases,
          { id: phaseId },
        ).products,
        { id: productId },
      ).timeline;
      const esCopy = lodash.find(
        lodash.find(
          lodash.find(esData, { id: projectId }).phases,
          { id: phaseId },
        ).products,
        { id: productId },
      ).timeline;
      console.log(`one mismatch found for Timeline with id ${id}`);
      return {
        type: 'mismatch',
        kind: item.type,
        dataType: item.dataType,
        projectId,
        id,
        modelName: 'Timeline',
        path,
        dbCopy,
        esCopy,
      };
    }
  };

  const processProduct = (item) => {
    const subPath = lodash.slice(item.path, 4);
    if (item.dataType === 'array' && subPath.length === 1) {
      return processMissingObject(item, { modelName: 'Product' });
    }
    if (['add', 'delete', 'modify'].includes(item.type)) {
      const path = scriptUtil.generateJSONPath(lodash.slice(subPath, 1));
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
        kind: item.type,
        dataType: item.dataType,
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
      if (item.path[5] === 'timeline') {
        if (item.path[6] === 'milestones') {
          return processMilestone(item);
        }
        return processTimeline(item);
      }
      return processProduct(item);
    }
    const subPath = lodash.slice(item.path, 2);
    if (item.dataType === 'array' && subPath.length === 1) {
      return processMissingObject(item, option);
    }
    if (['add', 'delete', 'modify'].includes(item.type)) {
      const path = scriptUtil.generateJSONPath(lodash.slice(subPath, 1));
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
        kind: item.type,
        dataType: item.dataType,
        projectId,
        modelName: option.modelName,
        id,
        path,
        dbCopy,
        esCopy,
      };
    }
  };

  if (delta.path.length > 2 && scriptConstants.associations.projects[delta.path[1]]) {
    return processAssociation(delta, {
      modelName: scriptConstants.associations.projects[delta.path[1]], refPath: delta.path[1],
    });
  }
  if (delta.dataType === 'array' && delta.path.length === 1) {
    if (delta.type === 'delete') {
      console.log(`one dbOnly found for Project with id ${delta.originalValue.id}`);
      return {
        type: 'dbOnly',
        modelName: 'Project',
        id: delta.originalValue.id,
        dbCopy: delta.originalValue,
      };
    }
    if (delta.type === 'add') {
      console.log(`one esOnly found for Project with id ${delta.value.id}`);
      return {
        type: 'esOnly',
        modelName: 'Project',
        id: delta.value.id,
        esCopy: delta.value,
      };
    }
  }
  if (['add', 'delete', 'modify'].includes(delta.type)) {
    const path = scriptUtil.generateJSONPath(lodash.slice(delta.path, 1));
    const id = lodash.get(finalData, lodash.slice(delta.path, 0, 1)).id;
    const dbCopy = lodash.find(dbData, { id });
    const esCopy = lodash.find(esData, { id });
    console.log(`one mismatch found for Project with id ${id}`);
    return {
      type: 'mismatch',
      kind: delta.type,
      dataType: delta.dataType,
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
 * @param {Object} dbData the data from DB
 * @param {Object} esData the data from ES
 * @returns {Object} the data to feed handlebars template
 */
function compareProjects(dbData, esData) {
  const data = {
    rootMismatch: {},
    esOnly: [],
    dbOnly: [],
  };

  const storeDelta = (delta) => {
    if (delta.modelName === 'Project') {
      if (delta.type === 'esOnly') {
        data.esOnly.push(delta);
        return;
      }
      if (delta.type === 'dbOnly') {
        data.dbOnly.push(delta);
        return;
      }
    }
    if (!data.rootMismatch[delta.projectId]) {
      data.rootMismatch[delta.projectId] = { project: [], associations: {} };
    }
    if (delta.modelName === 'Project') {
      data.rootMismatch[delta.projectId].project.push(delta);
      return;
    }
    const currentAssociations = data.rootMismatch[delta.projectId].associations;
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

  const countInconsistencies = () => {
    lodash.set(
      data,
      'meta.totalObjects',
      data.dbOnly.length + data.esOnly.length,
    );
    lodash.set(
      data,
      'meta.totalProjects',
      Object.keys(data.rootMismatch).length + data.dbOnly.length + data.esOnly.length,
    );
    lodash.map(data.rootMismatch, (value) => {
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
      data.meta.totalObjects += currentValue.meta.counts;
    });
  };

  const { deltas, finalData } = scriptUtil.diffData(
    dbData,
    esData,
    {
      hashKey: 'id',
      modelPathExprssions: {
        Project: '[*]',
        Phase: '[*].phases[*]',
        Product: '[*].phases[*].products[*]',
        Milestone: '[*].phases[*].products[*].timeline.milestones[*]',
        Invite: '[*].invites[*]',
        Member: '[*].members[*]',
        Attachment: '[*].attachments[*]',
      },
    },
  );
  for (const item of deltas) {
    if (scriptUtil.isIgnoredPath('project', item.path)) {
      continue; // eslint-disable-line no-continue
    }
    const delta = processDelta(item, dbData, esData, finalData);
    if (delta) {
      storeDelta(delta);
    }
  }
  countInconsistencies();
  return data;
}

module.exports = {
  compareProjects,
};
