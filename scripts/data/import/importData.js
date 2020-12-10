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
    // we disable no-await-in-loop because we need to run insert operations sequentially to avoid FK constraints errors
    /* eslint-disable no-await-in-loop */
    for (let index = 0; index < dataModels.length; index += 1) {
      const modelName = dataModels[index];
      currentModelName = modelName;
      const model = models[modelName];
      const modelRecords = jsonData[modelName];
      if (modelRecords && modelRecords.length > 0) {
        logger.info(`Importing data for model: ${modelName}`);
        await model.bulkCreate(modelRecords, {
          transaction,
        });
        logger.info(
          `Records imported for model: ${modelName} = ${modelRecords.length}`,
        );

        // Set autoincrement sequencers in the database to be set to max of the autoincrement column,
        // so that, when next insertions don't provide value of autoincrement column, as in case of using APIs,
        // it should be set automatically based on last value of sequencers.
        const modelAttributes = Object.keys(model.rawAttributes);
        const tableName = model.getTableName();
        /* eslint-disable no-await-in-loop */
        for (
          let attributeIndex = 0;
          attributeIndex < modelAttributes.length;
          attributeIndex += 1
        ) {
          const field = modelAttributes[attributeIndex];
          const fieldInfo = model.rawAttributes[field];
          if (fieldInfo.autoIncrement) {
            // Get sequence name corresponding to automincrment column in a table
            const selectSequenceQuery = `SELECT pg_get_serial_sequence('${tableName}', '${field}')`;
            const sequenceName = (
              await models.sequelize.query(selectSequenceQuery, {
                transaction,
              })
            )[0][0].pg_get_serial_sequence;

            // update sequence value to be set to max value of the autoincrement column in the table
            const query = `SELECT setval('${sequenceName}', (SELECT MAX(${field}) FROM ${tableName}))`;
            const setValue = (
              await models.sequelize.query(query, {
                transaction,
              })
            )[0][0].setval;
            logger.debug(
              `Updated autoIncrement for ${modelName}.${field} with max value = ${setValue}`,
            );
          }
        }
      } else {
        logger.info(`No records to import for model: ${modelName}`);
      }
    }
    // commit transaction only if all things went ok
    logger.info('committing transaction to database...');
    await transaction.commit();
  } catch (error) {
    logger.error('Error while writing data of model:', currentModelName);
    // rollback all insert operations
    if (transaction) {
      logger.info('rollback database transaction...');
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
  logger.info('Indexing metatdata...');
  await indexMetadata();

  logger.info('Indexing projects data...');
  const req = {
    logger,
    projectIdStart: 1,
    projectIdEnd: Number.MAX_SAFE_INTEGER,
    indexName: null,
    docType: null,
    fields: null,
    id: 0,
  };
  await indexProjectsRange(req);
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
