// force using test.json for unit tests

var config
if (process.env.NODE_ENV === 'test') {
  config = require('./test.json')
} else {
  config = {
      "authSecret": "secret",
      "logLevel": "debug",
      "captureLogs": "false",
      "logentriesToken": "",
      "rabbitmqURL": "amqp://dockerhost:5672",
      "fileServiceEndpoint": "https://api.topcoder-dev.com/v3/files/",
      "topicServiceEndpoint": "https://api.topcoder-dev.com/v4/topics/",
      "directProjectServiceEndpoint": "https://api.topcoder-dev.com/v3/direct",
      "userServiceUrl": "https://api.topcoder-dev.com/v3/users",
      "connectProjectsUrl": "https://connect.topcoder-dev.com/projects/",
      "salesforceLead" : {
        "webToLeadUrl": 'https://www.salesforce.com/servlet/servlet.WebToLead?encoding=UTF-8',
        "orgId": "00D28000000Vwnh",
        "projectNameFieldId": "00N2800000INiki",
        "projectDescFieldId": "00N2800000INiks",
        "projectLinkFieldId": "00N2800000INil7",
        "projectIdFieldId"  : "00N2800000INn2T"
      },
      "dbConfig": {
          "masterUrl": "postgres://coder:mysecretpassword@dockerhost:5432/projectsdb",
          "maxPoolSize": 50,
          "minPoolSize": 4,
          "idleTimeout": 1000
      }
  }
}
module.exports = config
