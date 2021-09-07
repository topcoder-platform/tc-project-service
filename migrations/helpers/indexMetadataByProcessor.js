/* eslint-disable no-console */
/**
 * Create metadata models events
 */
import _ from 'lodash';
import models from '../../src/models';
import { RESOURCES, BUS_API_EVENT } from '../../src/constants';
import { createEvent } from '../../src/services/busApi';

const modelConfigs = {
  ProjectTemplate: {
    indexProperty: 'projectTemplates',
    resource: RESOURCES.PROJECT_TEMPLATE,
  },
  ProductTemplate: {
    indexProperty: 'productTemplates',
    resource: RESOURCES.PRODUCT_TEMPLATE,
  },
  ProjectType: {
    indexProperty: 'projectTypes',
    resource: RESOURCES.PROJECT_TYPE,
  },
  ProductCategory: {
    indexProperty: 'productCategories',
    resource: RESOURCES.PRODUCT_CATEGORY,
  },
  MilestoneTemplate: {
    indexProperty: 'milestoneTemplates',
    resource: RESOURCES.MILESTONE_TEMPLATE,
  },
  OrgConfig: {
    indexProperty: 'orgConfigs',
    resource: RESOURCES.ORG_CONFIG,
  },
  Form: {
    indexProperty: 'forms',
    resource: RESOURCES.FORM_REVISION,
  },
  PlanConfig: {
    indexProperty: 'planConfigs',
    resource: RESOURCES.PLAN_CONFIG_REVISION,
  },
  PriceConfig: {
    indexProperty: 'priceConfigs',
    resource: RESOURCES.PRICE_CONFIG_REVISION,
  },
  // This model is not yet supported
  // BuildingBlock: {
  //   indexProperty: 'buildingBlocks',
  //   resource: RESOURCES.
  // },
};

/**
 * Sync metadata index
 *
 * @returns {Promise} promise when all is done
 */
async function syncMetadataIndex() {
  const modelNames = _.keys(modelConfigs);

  for (let i = 0; i < modelNames.length; i += 1) {
    const modelName = modelNames[i];
    const modelConfig = modelConfigs[modelName];
    const records = await models[modelName].findAll({ raw: true }); // eslint-disable-line no-await-in-loop

    console.log(`Syncing ${records.length} records for model ${modelName}...`);

    await Promise.all( // eslint-disable-line no-await-in-loop
      records.map(record =>
        createEvent(
          BUS_API_EVENT.PROJECT_METADATA_CREATE,
          _.assign({ resource: modelConfig.resource }, record),
          console,
        ),
      ),
    );
  }
}

syncMetadataIndex()
  .then(() => {
    console.log('Done. The event to sync data in ES have been published to Bus API!');
    process.exit();
  }).catch((err) => {
    console.error('Error', err);
    process.exit(1);
  });
