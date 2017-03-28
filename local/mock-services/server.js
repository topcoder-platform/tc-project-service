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

server.use(middlewares);

server.use(jsonServer.bodyParser);
server.use(authMiddleware);

// add additional search route for project members
server.get('/v3/members/_search', (req, res) => {
  const fields = _.isString(req.query.fields) ? req.query.fields.split(',') : [];
  const filter = _.isString(req.query.query) ? req.query.query.split(' OR ') : [];
  const criteria = _.map(filter, (single) => {
    const ret = { };
    const splitted = single.split(':');
    // if the result can be parsed successfully
    const parsed = jsprim.parseInteger(splitted[1], { allowTrailing: true, trimWhitespace: true });
    if (parsed instanceof Error) {
      ret[splitted[0]] = splitted[1];
    } else {
      ret[splitted[0]] = parsed;
    }
    return ret;
  });
  const userIds = _.map(criteria, 'userId');
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
    }
    return null;
  }).filter(_.identity);
  response.result.metadata = { totalCount: response.result.content.length };
  res.status(200).json(response);
});

server.use(router);

server.listen(PORT, () => {
  winston.info('JSON server started on port', PORT);
});
