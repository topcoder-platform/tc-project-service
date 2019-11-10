/**
 * Methods to index data from DB in ES.
 */
import _ from 'lodash';
import config from 'config';
import util from '../util';
import models from '../models';

const ES_METADATA_INDEX = config.get('elasticsearchConfig.metadataIndexName');
const ES_METADATA_TYPE = config.get('elasticsearchConfig.metadataDocType');

const eClient = util.getElasticSearchClient();

const modelConfigs = {
  ProjectTemplate: {
    indexProperty: 'projectTemplates',
  },
  ProductTemplate: {
    indexProperty: 'productTemplates',
  },
  ProjectType: {
    indexProperty: 'projectTypes',
  },
  ProductCategory: {
    indexProperty: 'productCategories',
  },
  MilestoneTemplate: {
    indexProperty: 'milestoneTemplates',
  },
  OrgConfig: {
    indexProperty: 'orgConfigs',
  },
  Form: {
    indexProperty: 'forms',
  },
  PlanConfig: {
    indexProperty: 'planConfigs',
  },
  PriceConfig: {
    indexProperty: 'priceConfigs',
  },
  BuildingBlock: {
    indexProperty: 'buildingBlocks',
  },
};

/**
 * Index metadata models defined by `modelConfigs`
 *
 * @returns {Promise} esClient.index result
 */
async function indexMetadata() {
  const modelNames = _.keys(modelConfigs);
  const body = {};

  for (let i = 0; i < modelNames.length; i += 1) {
    const modelName = modelNames[i];
    const modelConfig = modelConfigs[modelName];
    const records = await models[modelName].findAll({ raw: true }); // eslint-disable-line no-await-in-loop

    body[modelConfig.indexProperty] = records;
  }

  // TODO add check that there is no data in ES_METADATA_INDEX yet, or throw an error

  return eClient.index({
    index: ES_METADATA_INDEX,
    type: ES_METADATA_TYPE,
    body,
  });
}

module.exports = {
  indexMetadata,
};
