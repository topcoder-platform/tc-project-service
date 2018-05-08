// force using test.json for unit tests

let config;
if (process.env.NODE_ENV === 'test') {
  config = require('./test.json');
} else {
  config = {
    authSecret: 'secret',
    authDomain: 'topcoder-dev.com',
    logLevel: 'debug',
    captureLogs: 'false',
    logentriesToken: '',
    rabbitmqURL: 'amqp://dockerhost:5672',
    fileServiceEndpoint: 'https://api.topcoder-dev.com/v3/files/',
    directProjectServiceEndpoint: 'https://api.topcoder-dev.com/v3/direct',
    connectProjectsUrl: 'https://connect.topcoder-dev.com/projects/',
    memberServiceEndpoint: 'http://dockerhost:3001/members',
    dbConfig: {
      masterUrl: 'postgres://coder:mysecretpassword@dockerhost:54321/projectsdb',
      maxPoolSize: 50,
      minPoolSize: 4,
      idleTimeout: 1000,
    },
    elasticsearchConfig: {
      host: 'dockerhost:9200',
      // target elasticsearch 2.3 version
      apiVersion: '2.3',
      indexName: 'projects',
      docType: 'projectV4'
    },
  };
}
module.exports = config;
