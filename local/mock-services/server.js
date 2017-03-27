/**
 * Start Mock services server
 * This file is used to setup custom middlewares to process members filter request
 */
const PORT = 3001;
const jsonServer = require('json-server');
const _ = require('lodash');
const isSubset = require('is-subset');
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
server.get('/members/_search', (req, res) => {
  const fields = _.isString(req.query.fields) ? req.query.fields.split(',') : [];
  const filter = _.isString(req.query.query) ? req.query.query.split(' OR ') : [];
  const criteria = _.map(filter, (single) => {
    const ret = { };
    const splitted = single.split('&');
    // if the result can be parsed successfully
    const parsed = jsprim.parseInteger(splitted[1], { allowTrailing: true, trimWhitespace: true });
    if (parsed instanceof Error) {
      ret[splitted[0]] = splitted[1];
    } else {
      ret[splitted[0]] = parsed;
    }
    return ret;
  });
  const cloned = _.cloneDeep(members);
  const response = _.map(criteria, (item) => {
    let found = _.find(cloned, single => isSubset(single.result.content, item));
    if (_.isUndefined(found)) {
      found = cloned[0];
    }
    found.result.content = _.merge(found.result.content, item);
    if (fields.length > 0) {
      found.result.content = _.pick(found.result.content, fields);
    }
    return found;
  });

  res.status(200).json(response);
});

server.use(router);

server.listen(PORT, () => {
  winston.info('JSON server started on port', PORT);
});
