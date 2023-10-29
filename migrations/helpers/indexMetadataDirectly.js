/* eslint-disable no-console */
/**
 * Sync metadata models from DB to ES using direct call of es client.
 *
 * Advantage: It syncs data fast and we know if the process was successful or no.
 *
 * Disadvantage: As in real life data is indexing using "project-processor-es", it may happen
 *               that our custom implementation is somehow different. Though it shouldn't.
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
