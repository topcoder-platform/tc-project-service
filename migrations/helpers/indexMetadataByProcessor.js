/* eslint-disable no-console */
/**
 * Sync metadata models from DB to ES using "project-processor-es".
 *
 * The main purpose of this script is to use during development to validate that all metadata can be
 * correctly indexed using "project-processor-es".
 *
 * Advantage: It sync DB data to ES using "project-processor-es" as if were adding them using API.
 *            So the result of this process is closer to what we would get if we added these objects
 *            using API.
 *
 * Disadvantage: We don't know when the syncing process is done and if there are any errors or no.
 *               To get this information we have to watch the log of "project-processor-es".
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
  // This model is not yet supported by "project-processor-es"
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
