/**
 * Start Mock services server
 * This file is used to setup custom middlewares to process members filter request
 */
const PORT = 3001;
const jsonServer = require('json-server');
const _ = require('lodash');
const winston = require('winston');
const jsprim = require('jsprim');

const server = jsonServer.create();
const router = jsonServer.router('services.json');
const middlewares = jsonServer.defaults();
const authMiddleware = require('./authMiddleware');

const members = require('./services.json').members;
const roles = require('./services.json').roles;

server.use(middlewares);

server.use(jsonServer.bodyParser);
server.use(authMiddleware);

// add additional search route for project members
server.get('/v3/members/_search', (req, res) => {
  const fields = _.isString(req.query.fields) ? req.query.fields.split(',') : [];
  const filter = _.isString(req.query.query) ?
    req.query.query.replace(/%2520/g, ' ').replace(/%20/g, ' ').split(' OR ') : [];
  const criteria = _.map(filter, (single) => {
    const ret = {};
    const splitted = single.split(':');
    // if the result can be parsed successfully
    let parsed = Error();
    try {
      parsed = jsprim.parseInteger(splitted[1], { allowTrailing: true, trimWhitespace: true });
    } catch (e) {
      // no-empty
    }
    if (parsed instanceof Error) {
      ret[splitted[0]] = splitted[1];
    } else {
      ret[splitted[0]] = parsed;
    }
    return ret;
  });
  const userIds = _.map(criteria, 'userId');
  const handles = _.map(criteria, 'handle');
  const handleLowers = _.map(criteria, 'handleLower');
  const cloned = _.cloneDeep(members);
  const response = {
    id: 'res1',
    result: {
      success: true,
      status: 200,
    },
  };
  response.result.content = _.map(cloned, (single) => {
    if (_.indexOf(userIds, single.result.content.userId) > -1) {
      let found = single.result.content;
      if (fields.length > 0) {
        found = _.pick(found, fields);
      }
      return found;
    } else if (_.indexOf(handles, single.result.content.handle) > -1) {
      let found = single.result.content;
      if (fields.length > 0) {
        found = _.pick(found, fields);
      }
      return found;
    } else if (_.indexOf(handleLowers, single.result.content.handleLower) > -1) {
      let found = single.result.content;
      if (fields.length > 0) {
        found = _.pick(found, fields);
      }
      return found;
    }
    return null;
  }).filter(_.identity);
  response.result.metadata = { totalCount: response.result.content.length };
  res.status(200).json(response);
});


// add filter route for project members
server.get('/users', (req, res) => {
  const filter = req.query.filter.replace(/%2520/g, ' ').replace(/%20/g, ' ').replace('%3D', ' ');
  const allEmails = filter.split('=')[1];
  const emails = allEmails.split('OR');
  const cloned = _.cloneDeep(members);
  const response = {
    id: 'res1',
    result: {
      success: true,
      status: 200,
    },
  };
  const users = _.filter(cloned, single => _.includes(emails, single.result.content.email));
  response.result.content = _.map(users,
    single => _.assign(single.result.content, { id: single.result.content.userId }));
  response.result.metadata = { totalCount: response.result.content.length };
  res.status(200).json(response);
});

// add additional search route for project members
server.get('/roles', (req, res) => {
  const filter = _.isString(req.query.filter) ?
    req.query.filter.replace(/%2520/g, ' ').replace(/%20/g, ' ').split('=') : [];
  const cloned = _.cloneDeep(roles);
  const response = {
    id: 'res1',
    result: {
      success: true,
      status: 200,
    },
  };
  const role = filter ? _.find(cloned, (single) => {
    if (single.userId === filter[1]) {
      return single.roles;
    }
    return null;
  }) : null;

  response.result.content = role ? role.roles : [];
  res.status(200).json(response);
});

server.use(router);

server.listen(PORT, () => {
  winston.info('JSON server started on port', PORT);
});
