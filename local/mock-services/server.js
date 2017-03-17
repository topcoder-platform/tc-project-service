/**
 * Start Mock services server
 * This file is used to setup custom middlewares to process members filter request
 */
const PORT = 3001;
const jsonServer = require('json-server');
const _ = require('lodash');
const isSubset = require('is-subset');
const winston = require('winston');

const server = jsonServer.create();
const router = jsonServer.router('services.json');
const middlewares = jsonServer.defaults();
const authMiddleware = require('./authMiddleware');

const members = require('./services.json').members;

server.use(middlewares);

server.use(jsonServer.bodyParser);
server.use(authMiddleware);

// add additional search route for project members
server.get('/members/_search', (req, res) => {
  const fields = _.isString(req.query.fields) ? req.query.fields.split(',') : [];
  const filter = _.isString(req.query.query) ? req.query.query.split(' OR ') : [];
  const criteria = _.map(filter, (single) => {
    const ret = { };
    const splitted = single.split('&');
    ret[splitted[0]] = splitted[1];
    return ret;
  });

  const response = _.map(_.cloneDeep(members), (single) => {
    const subset = isSubset(single.result.content, criteria);
    if (fields.length > 0) {
      single.result.content = _.pick(single.result.content, fields);
    }
    // since this is mock so always return something
    if (subset) {
      return single;
    }
    return single;
  });

  res.status(200).json(response[0]);
});

server.use(router);

server.listen(PORT, () => {
  winston.info('JSON server started on port', PORT);
});
