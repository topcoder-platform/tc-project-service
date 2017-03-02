/**
 * Sync the database models to db tables.
 */

import winston from 'winston';

/**
 * Make sure we are in development mode
 * @type {String}
 */
// process.env.NODE_ENV = 'development'

require('../dist/models').default.sequelize.sync({ force: true })
  .then(() => {
    winston.info('Database synced successfully');
    process.exit();
  }).catch((err) => {
    winston.error('Error syncing database', err);
    process.exit(1);
  });
