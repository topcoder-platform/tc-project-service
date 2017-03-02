

// include newrelic
if (process.env.NODE_ENV !== 'test' && process.env.NODE_ENV !== 'local') {
  require('newrelic');
}

const app = require('./app');

/**
 * Handle server shutdown gracefully
 * @return {Void}         This function returns void
 */
function gracefulShutdown() {
  app.services.pubsub.disconnect()
    .then(() => {
      app.logger.info('Gracefully shutting down server');
      process.exit();
    }).catch((err) => {
      app.logger.error(err);
    });
  // if after
  setTimeout(() => {
    app.logger.error('Could not close connections in time, forcefully shutting down');
    process.exit();
  }, 10 * 1000);
}
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// =======================
// start the server ======
// =======================
const port = process.env.PORT || 3000; // used to create, sign, and verify tokens

const server = app.listen(port, () => {
  app.logger.info('Starting server on PORT: %d', port);
  const authz = require('tc-core-library-js').Authorizer;
  app.logger.info('Registered Policies', authz.getRegisteredPolicies());
  require('express-list-routes')({ prefix: '', spacer: 7 }, 'APIs:', app.routerRef);
});

module.exports = server;
