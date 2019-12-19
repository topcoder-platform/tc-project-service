/* eslint-disable  no-console */
/**
 * Update all records in the ProjectTemplate table.
 * - inside “scope” field update “buildingBlocks.<KEY>.price” (for any <KEY>) to be a string if it’s not a string.
 * - inside “scope” field replace all the ‘“wizard”: true’ with ‘“wizard”: {“enabled”: true}’,
 *   and ‘“wizard”: false’ replace with ‘“wizard”: {“enabled”: false}’.
 * Update all records in the ProductTemplate table.
 * - inside "template" field update all "required" properties which is not of "boolean" type to boolean.
 */
import fixMetadataForES from '../src/utils/fixMetadataForES';

fixMetadataForES(console)
  .then(() => {
    console.log('done!');
    process.exit();
  }).catch((err) => {
    console.error('Error syncing database', err);
    process.exit(1);
  });
