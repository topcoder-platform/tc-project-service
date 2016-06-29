// force using test.json for unit tests

var config
if (process.env.ENVIRONMENT === 'test') {
  config = require('./test.json')
} else {
  config = {
      "authSecret": "secret",
      "logLevel": "debug",
      "captureLogs": "false",
      "logentriesToken": "",
      "rabbitmqURL": "amqp://dockerhost:5672",
      "dbConfig": {
          "masterUrl": "postgres://coder:mysecretpassword@dockerhost:5432/projectsdb",
          "maxPoolSize": 50,
          "minPoolSize": 4,
          "idleTimeout": 1000
      }
  }
}
module.exports = config
