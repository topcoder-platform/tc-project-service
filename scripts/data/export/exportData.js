import * as fs from 'fs';
import models from '../../../src/models';
import { dataModels, validateDataModels } from '../dataModels';

/**
 * saves data to file
 * @param {string}    filePath        path of file where to save data
 * @param {object}    data        object contains loaded data for specified models
 * @param {object}    logger        logger instance
 * @return {Promise}              Returns a promise
 */
function saveExportedData(filePath, data, logger) {
  logger.info('Start Saving data to file....');
  fs.writeFileSync(filePath, JSON.stringify(data));
  logger.info('End Saving data to file....');
}
/**
 * loads data  from database and export it to specified file path
 * @param {string}    filePath        path of file where to save data
 * @param {object}    logger        logger instance
 * @return {Promise}              Returns a promise
 */
async function exportDatabaseToJson(filePath, logger) {
  const queries = [];
  for (let index = 0; index < dataModels.length; index += 1) {
    const modelName = dataModels[index];
    // queries.push(models[modelName].findAll({ raw: true }));
    // We use direct select to ignore hooks as we want to export database as it including soft-deleted records
    queries.push(
      models.sequelize.query(
        `SELECT * from ${models[modelName].getTableName()}`,
      ),
    );
  }
  const results = await Promise.all(queries);
  const allModelsRecords = {};
  for (let index = 0; index < dataModels.length; index += 1) {
    const modelName = dataModels[index];
    const modelRecords = results[index][0];
    allModelsRecords[modelName] = modelRecords;
    logger.info(
      `Records loaded for model: ${modelName} = ${modelRecords.length}`,
    );
  }

  saveExportedData(filePath, allModelsRecords, logger);
}
/**
 * validates data models existence, then loads their data from database, and export it to specified file path
 * @param {string}    filePath        path of file where to save data
 * @param {object}    logger        logger instance
 * @return {Promise}              Returns a promise
 */
async function exportData(filePath, logger) {
  validateDataModels();
  await exportDatabaseToJson(filePath, logger);
}
module.exports = {
  exportData,
};
