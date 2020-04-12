import * as fs from 'fs';
import models from '../../../src/models';
import { dataModels, validateDataModels } from '../dataModels';
import { indexMetadata, indexProjectsRange } from '../../../src/utils/es';

/**
 * import data from json file to database
 * @param {string}    filePath        path of file where to save data
 * @param {object}    logger        logger instance
 * @return {Promise}              Returns a promise
 */
async function writeDataToDatabase(filePath, logger) {
  let transaction = null;
  let currentModelName = null;
  try {
    // Start a transaction
    transaction = await models.sequelize.transaction();
    const jsonData = JSON.parse(fs.readFileSync(filePath).toString());
    /* eslint-disable no-await-in-loop */
    for (let index = 0; index < dataModels.length; index += 1) {
      const modelName = dataModels[index];
      currentModelName = modelName;
      const modelRecords = jsonData[modelName];
      if (modelRecords && modelRecords.length > 0) {
        await models[modelName].bulkCreate(modelRecords, {
          transaction,
        });
        logger.log(
          `Records to save for model: ${modelName} = ${modelRecords.length}`,
        );
      } else {
        logger.log(`No records to save for model: ${modelName}`);
      }
    }
    // commit transaction only if all things went ok
    logger.log('committing transaction to database...');
    await transaction.commit();
  } catch (error) {
    logger.error('Error while writing data of model:', currentModelName);
    // rollback all insert operations
    if (transaction) {
      logger.log('rollback database transaction...');
      transaction.rollback();
    }
    if (error.name && error.errors && error.fields) {
      // For sequelize validation errors, we throw only fields with data that helps in debugging error,
      // because the error object has many fields that contains very big sql query for the insert bulk operation
      throw new Error(
        JSON.stringify({
          modelName: currentModelName,
          name: error.name,
          errors: error.errors,
          fields: error.fields,
        }),
      );
    } else {
      throw error;
    }
  }
}

/**
 * index imported data to Elasticsearch
 * @param {object}    logger        logger instance
 * @return {Promise}              Returns a promise
 */
async function indexDataToES(logger) {
  logger.log('Indexing metatdata...');
  await indexMetadata();

  logger.log('Indexing projects data...');
  const req = {
    logger,
    projectIdStart: 1,
    projectIdEnd: Number.MAX_SAFE_INTEGER,
    indexName: null,
    docType: null,
    fields: null,
    id: 0,
  };
  await new Promise((resolve, reject) => {
    indexProjectsRange(
      req,
      null,
      (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      },
    );
  });
}

/**
 * import data from json file to database and index it to Elasticsearch
 * @param {string}    filePath        path of file where to save data
 * @param {object}    logger        logger instance
 * @return {Promise}              Returns a promise
 */
async function importData(filePath, logger) {
  validateDataModels(logger);
  await writeDataToDatabase(filePath, logger);
  await indexDataToES(logger);
}
module.exports = {
  importData,
};
