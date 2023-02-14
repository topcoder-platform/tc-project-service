/* eslint-disable no-console */
/**
 * Sync the elastic search indices.
 * For the application to funtion properly it is necessary
 * that following indices are created in elasticsearch before running the application
 *
 * 1. projects: Index for projects. Logically corresponds to project model
 *              and serves as root.
 *              members and attachments will be stored as nested objects to parent document
 *
 */

import config from 'config';
import util from '../src/util';
import esUtils from '../src/utils/es';

const ES_PROJECT_INDEX = config.get('elasticsearchConfig.indexName');
const ES_TIMELINE_INDEX = config.get('elasticsearchConfig.timelineIndexName');
const ES_METADATA_INDEX = config.get('elasticsearchConfig.metadataIndexName');
const ES_CUSTOMER_PAYMENT_INDEX = config.get(
  'elasticsearchConfig.customerPaymentIndexName',
);

// all indexes supported by this script
const supportedIndexes = [
  ES_PROJECT_INDEX,
  ES_TIMELINE_INDEX,
  ES_METADATA_INDEX,
  ES_CUSTOMER_PAYMENT_INDEX,
];

/**
 * Sync elasticsearch indices.
 *
 * @param {String} [indexName] index name to sync, if it's not define, then all indexes are recreated
 *
 * @returns {Promise} resolved when sync is complete
 */
async function sync(indexName) {
  if (indexName && supportedIndexes.indexOf(indexName) === -1) {
    throw new Error(`Index "${indexName}" is not supported.`);
  }
  const indexesToSync = indexName ? [indexName] : supportedIndexes;

  // create new elasticsearch client
  // the client modifies the config object, so always passed the cloned object
  const esClient = util.getElasticSearchClient();

  // eslint-disable-next-line no-restricted-syntax
  for (const element of indexesToSync) {
    const indexToSync = element;

    console.log(`Deleting "${indexToSync}" index...`);
    await esClient.indices.delete({ index: indexToSync, ignore: [404] }); // eslint-disable-line no-await-in-loop
    console.log(`Creating "${indexToSync}" index...`);
    // eslint-disable-next-line no-await-in-loop
    await esClient.indices.create(esUtils.buildCreateIndexRequest(indexToSync)); // eslint-disable-line no-await-in-loop
  }
}

if (!module.parent) {
  // if we pass index name in command line arguments, then sync only that index
  const indexName =
    process.argv[2] === '--index-name' && process.argv[3]
      ? process.argv[3]
      : undefined;

  // to avoid accidental resetting of all indexes in PROD, enforce explicit defining of index name if not in
  // development or test environment
  if (
    ['development', 'test'].indexOf(process.env.NODE_ENV) === -1 &&
    !indexName
  ) {
    console.error(
      'Error. "--index-name" should be provided when run this command in non-development environment.',
    );
    console.error(
      'Example usage: "$ npm run sync:es -- --index-name metadata"',
    );
    process.exit(1);
  }

  sync(indexName)
    .then(() => {
      console.log('ElasticSearch indices synced successfully.');
      process.exit();
    })
    .catch((err) => {
      console.error('ElasticSearch indices sync failed: ', err);
      process.exit(1);
    });
}

module.exports = {
  sync,
};
