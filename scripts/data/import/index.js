import * as fs from 'fs';
import { importData } from './importData';

const logger = console;
const filePath = (process.argv[2] === '--file' && process.argv[3]) ? process.argv[3] : 'data/demo-data.json';
// check if file exists
if (!fs.existsSync(filePath)) {
  logger.error('File is not existing:', filePath);
  process.exit(1);
} else {
  logger.log('Script will import data from file:', filePath);
  importData(filePath, logger)
    .then(() => {
      logger.log('Successfully imported data');
      process.exit(0);
    })
    .catch((err) => {
      logger.error('Failed to import data, ERROR:', err.message || err);
      process.exit(1);
    });
}
