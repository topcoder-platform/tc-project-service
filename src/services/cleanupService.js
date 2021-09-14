/* eslint-disable no-restricted-syntax,no-await-in-loop */
/**
 * Clear the postman test data. All data created by postman e2e tests will be cleared.
 */
import models from '../../src/models';

const config = require('config');
const { QueryTypes } = require('sequelize');
const elasticsearch = require('elasticsearch');


// Elasticsearch client
let esClient;

/**
 * Get ES Client
 * @return {Object} Elasticsearch Client Instance
 */
function getESClient() {
  if (esClient) {
    return esClient;
  }
  const esHost = config.get('elasticsearchConfig.host');

  esClient = new elasticsearch.Client({
    apiVersion: config.get('elasticsearchConfig.apiVersion'),
    hosts: esHost,
  });
  return esClient;
}

/**
 * Delete the Resource from the ES by the given id
 * @param {string} projectId the project id
 * @returns {void}
 */
const deleteFromESById = async (projectId) => {
  // delete from ES
  const client = await getESClient();
  try {
    await client.delete({
      index: config.elasticsearchConfig.indexName,
      type: config.elasticsearchConfig.docType,
      id: projectId,
      refresh: 'true', // refresh ES so that it is effective for read operations instantly
    });
  } catch (err) {
    // ignore if not found
  }
};

/**
 * Delete the records by the given field.
 * @param {Object} tableName the table name
 * @param {String} fieldName the field name
 * @param {String} fieldValue the field value
 * @param {Object} t the transaction
 * @return {void}
 */
const deleteByField = async (tableName, fieldName, fieldValue, t) => {
  await models.sequelize.query(`delete from ${tableName} where "${fieldName}" = :value`, {
    replacements: { value: fieldValue },
    type: QueryTypes.DELETE,
  }, { transaction: t });
};


/**
 * Clear the postman test data. The main function of this class.
 * @param {Object} req the request
 * @return {void}
 */
export default async function cleanUpTestData(req) {
  req.log.info('Start clean up the test data from postman test!');
  await models.sequelize.transaction(async (t) => {
    // check ProjectType and its related records
    const records = await models.sequelize.query('SELECT * FROM project_types where key like :value', {
      model: models.ProjectType,
      replacements: { value: `${config.AUTOMATED_TESTING_NAME_PREFIX}%` },
      mapToModel: true,
    });
    for (const r of records) {
      const typeKey = r.dataValues.key;
      const projects = await models.sequelize.query('SELECT * FROM projects where type = :value', {
        model: models.Project,
        replacements: { value: typeKey },
        mapToModel: true,
      });
      for (const p of projects) {
        const projectId = p.dataValues.id;
        req.log.info('delete all estimation related to this project');
        const estimations =
          await models.sequelize.query('SELECT * FROM project_estimations where "projectId" = :value', {
            model: models.ProjectEstimation,
            replacements: { value: projectId },
            mapToModel: true,
          });
        for (const e of estimations) {
          const estimationId = e.dataValues.id;
          await deleteByField('project_estimation_items', 'projectEstimationId', estimationId, t);
        }
        await deleteByField('project_estimations', 'projectId', projectId, t);

        req.log.info('delete all phase related to this project');
        const phases = await models.sequelize.query('SELECT * FROM project_phases where "projectId" = :value', {
          model: models.ProjectPhase,
          replacements: { value: projectId },
          mapToModel: true,
        });
        for (const phase of phases) {
          const phaseId = phase.dataValues.id;
          await deleteByField('phase_work_streams', 'phaseId', phaseId, t);
          await deleteByField('phase_products', 'phaseId', phaseId, t);
        }
        await deleteByField('project_phases', 'projectId', projectId, t);

        req.log.info('delete all project related tables');
        await deleteByField('project_settings', 'projectId', projectId, t);
        await deleteByField('project_attachments', 'projectId', projectId, t);
        await deleteByField('project_members', 'projectId', projectId, t);
        req.log.info('delete the project from db and es');
        await deleteByField('projects', 'id', projectId, t);
        // delete project es
        await deleteFromESById(projectId);
      }
      req.log.info('delete the project type');
      await deleteByField('project_types', 'key', typeKey, t);
    }
    req.log.info('Finish clean up the test data from postman test!');
  });
};

