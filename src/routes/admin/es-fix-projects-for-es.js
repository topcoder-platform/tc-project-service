/**
 * Admin endpoint to fix project in DB to be indexed in ES.
 *
 * Waits until the operation is completed and returns result.
 */
import { middleware as tcMiddleware } from 'tc-core-library-js';
import fixProjectsForES from '../../utils/fixProjectsForES';

const permissions = tcMiddleware.permissions;

/**
 * Create a simple logger to log into an array.
 *
 * @param {Object} defaultLogger default logger which should be used apart from logging to array
 *
 * @returns {Object} logger
 */
const createArrayLogger = (defaultLogger) => {
  const loggerMethods = ['trace', 'debug', 'info', 'warn', 'error'];
  const log = [];
  const logger = {};

  loggerMethods.forEach((method) => {
    logger[method] = (message) => {
      // log directly with the default logger first
      defaultLogger[method](message);
      // save the same message to the array
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
      logger.debug('Entered Admin#fixProjectsForEs');

      // this logger would use the default `logger` to log into console
      // while saving the same log messages to an array, so we can return it in response
      const arrayLogger = createArrayLogger(logger);

      fixProjectsForES(arrayLogger)
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
