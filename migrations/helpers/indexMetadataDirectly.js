/* eslint-disable no-console */
/**
 * Sync metadata models from DB to ES using direct call of es client.
 *
 */
import { indexMetadata } from '../../src/utils/es';

console.log('Indexing metadata from DB...');

indexMetadata()
  .then(() => {
    console.log('Done!');
    process.exit();
  }).catch((err) => {
    console.error('Error', err);
    process.exit(1);
  });
