import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import Promise from 'bluebird';
import util from '../../../src/util';
import { exportData } from './exportData';
/**
 * executes export data function and handles error
 * @param {string}    filePath        path of file where to save data
 * @param {object}    logger        logger instance
 * @return {Promise}              Returns a promise
 */
function runExportData(filePath, logger) {
  exportData(filePath, logger)
    .then(() => {
      logger.info('Successfully exported data');
      process.exit(0);
    })
    .catch((err) => {
      logger.error('Failed to export data, ERROR:', err.message || err);
      process.exit(1);
    });
}

const logger = util.getScriptsLogger();
const filePath =
  process.argv[2] === '--file' && process.argv[3]
    ? process.argv[3]
    : 'data/demo-data.json';
logger.info('Script will export data to file:', filePath);
// check if file exists
if (fs.existsSync(filePath)) {
// We delay question for overwrite file, because the question overlaps with a warning message from sequelize module
  Promise.delay(1).then(() => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    // confirm overwritting to file
    rl.question(
      'File already exists, Are you sure to overwrite it? [Y] to overwrite: ',
      (answer) => {
        rl.close();
        if (answer.toLowerCase() === 'y') {
          logger.info('File will be overwritten.');
          runExportData(filePath, logger);
        } else {
          logger.info('Exit without exporting any data');
          process.exit(0);
        }
      },
    ); // question()
  });
} else {
  // get base directory of the file
  const baseDir = path.resolve(filePath, '..');
  // create directory recursively if it does not exist
  util.mkdirSyncRecursive(baseDir);
  runExportData(filePath, logger);
}
