'use strict'

// include newrelic
if (process.env.ENVIRONMENT !== 'test')
  require('newrelic')

const app = require('./app')


/**
 * Handle server shutdown gracefully
 */
function gracefulShutdown() {
  app.services.pubsub.disconnect()
    .then(()=> {
      app.logger.info('Gracefully shutting down server')
      process.exit()
    }).catch((err) => {
      app.logger.error(err)
    })
  // if after
   setTimeout(function() {
       app.logger.error("Could not close connections in time, forcefully shutting down");
       process.exit()
  }, 10*1000);
}
process.on('SIGTERM', gracefulShutdown)
process.on('SIGINT', gracefulShutdown)

// =======================
// start the server ======
// =======================
var port = process.env.PORT || 3000 // used to create, sign, and verify tokens

var server = app.listen(port, () => {
  app.logger.info("Starting server on PORT: %d", port)
  let authz = require('tc-core-library-js').Authorizer
  app.logger.info("Registered Policies", authz.getRegisteredPolicies())
  require('express-list-routes')({prefix: '', spacer: 7}, 'APIs:', app.routerRef)
})

module.exports = server
