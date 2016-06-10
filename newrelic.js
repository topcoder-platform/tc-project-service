'use strict'

/**
 * New Relic agent configuration.
 *
 * See lib/config.defaults.js in the agent distribution for a more complete
 * description of configuration variables and their potential values.
 */
var appName = "tc-projects-service"
if (process.env.ENVIRONMENT === 'development') {
  appName += "-dev"
} else if (process.env.ENVIRONMENT === 'qa') {
  appName += "-qa"
} else {
  appName += '-prod'
}

exports.config = {
  /**
   * Array of application names.
   */
  app_name: [appName],
  /**
   * Your New Relic license key.
   */
  license_key: process.env.NEW_RELIC_LICENSE_KEY,
  logging: {
    /**
     * Level at which to log. 'trace' is most useful to New Relic when diagnosing
     * issues with the agent, 'info' and higher will impose the least overhead on
     * production applications.
     */
    level: 'info'
  }
}
