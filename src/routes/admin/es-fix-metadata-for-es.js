/**
 * Admin endpoint to fix metadata in DB to be indexed in ES.
 *
 * Waits until the operation is completed and returns result.
 */
import { middleware as tcMiddleware } from 'tc-core-library-js';
import fixMetadataForES from '../../utils/fixMetadataForES';

const permissions = tcMiddleware.permissions;

/**
 * Create a simple logger to log into an array.
 *
 * @returns {Object} logger
 */
const createArrayLogger = () => {
  const loggerMethods = ['trace', 'debug', 'info', 'warn', 'error'];
  const log = [];
  const logger = {};

  loggerMethods.forEach((method) => {
    logger[method] = (message) => {
      log.push({
        level: method,
        message,
      });
    };
  });

  logger.getLog = () => log;

  return logger;
};

module.exports = [
  permissions('project.admin'),
  (req, res, next) => {
    try {
      const logger = req.log;
      logger.debug('Entered Admin#fixMetadataForEs');

      const arrayLogger = createArrayLogger();

      fixMetadataForES(arrayLogger)
        .then(() => {
          arrayLogger.info('Data has been successfully fixed in DB.');
          res.status(200).json(arrayLogger.getLog());
        })
        .catch(next);
    } catch (err) {
      next(err);
    }
  },
];
