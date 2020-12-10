/* eslint-disable no-console, no-restricted-syntax, no-await-in-loop */
/*
 * Insert ES mock data.
 */
import config from 'config';
import util from '../../../src/util';

const es = util.getElasticSearchClient();
const ES_PROJECT_INDEX = config.get('elasticsearchConfig.indexName');
const ES_PROJECT_TYPE = config.get('elasticsearchConfig.docType');
const ES_METADATA_INDEX = config.get('elasticsearchConfig.metadataIndexName');
const ES_METADATA_TYPE = config.get('elasticsearchConfig.metadataDocType');
const ES_TIMELINE_INDEX = config.get('elasticsearchConfig.timelineIndexName');
const ES_TIMELINE_TYPE = config.get('elasticsearchConfig.timelineDocType');

const projectsFromES = require('./Project.es.dump.json');
const metadataFromES = require('./Metadata.es.dump.json');
const timelinesFromES = require('./Timeline.es.dump.json');

/**
 * Main function.
 *
 * @returns {Promise} void
 */
async function main() {
  for (const data of projectsFromES) {
    await es.index({
      index: ES_PROJECT_INDEX,
      type: ES_PROJECT_TYPE,
      id: data.id,
      body: data,
      refresh: 'wait_for',
    });
    console.log(`insert project with id ${data.id}`);
  }
  for (const metadata of metadataFromES) {
    console.log('inserting metadata...');
    await es.index({
      index: ES_METADATA_INDEX,
      type: ES_METADATA_TYPE,
      body: metadata,
      refresh: 'wait_for',
    });
    console.log('inserting metadata done!');
  }
  for (const timeline of timelinesFromES) {
    await es.index({
      index: ES_TIMELINE_INDEX,
      type: ES_TIMELINE_TYPE,
      body: timeline,
      refresh: 'wait_for',
    });
    console.log(`insert timeline with id ${timeline.id}`);
  }
}

main().then(() => {
  console.log('done!');
}).catch((err) => {
  console.error(`Error ${err.name} occurs. Operation failed`);
  process.exit(1);
});
