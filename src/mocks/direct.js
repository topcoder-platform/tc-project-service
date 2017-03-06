

import express, { Router } from 'express';
import _ from 'lodash';
import bodyParser from 'body-parser';
import config from 'config';
import coreLib from 'tc-core-library-js';
import expressRequestId from 'express-request-id';
import https from 'https';
import path from 'path';
import fs from 'fs';

const util = require('tc-core-library-js').util(config);
const jwtAuth = require('tc-core-library-js').middleware.jwtAuthenticator;

config.version = 'v3';

const app = express();
app.use(bodyParser.urlencoded({
  extended: false,
}));
app.use(bodyParser.json());
// add request Id
const addRequestId = expressRequestId();
app.use(addRequestId);

// Logger
const appName = 'tc-mock-direct';
const logger = coreLib.logger({
  name: appName,
  level: _.get(config, 'logLevel', 'debug').toLowerCase(),
  captureLogs: config.get('captureLogs'),
  logentriesToken: _.get(config, 'logentriesToken', null),
});
app.use(coreLib.middleware.logger(null, logger));
app.logger = logger;

const router = Router();
router.all('/v3/direct/projects*', jwtAuth());

const projectId = 2;
const projects = {
  1: {
    projectName: 'test direct project1',
    projectDescription: 'test direct project1',
    billingAccountId: 2,
    copilotUserId: 4,
    id: 1,
  },
};

// Register all the routes
router.route('/v3/direct/projects')
    .get((req, res) => {
      app.logger.info('get direct projects');
      res.json(util.wrapResponse(req.id, { projects }));
    })
    .post((freq, res) => {
      const req = freq;
      app.logger.info({ body: req.body }, 'create direct project');
      const newId = projectId + 1;
      req.body.id = newId;
      projects[newId] = req.body;
      res.json(util.wrapResponse(req.id, { projectId: newId }));
    });

router.route('/v3/direct/projects/:projectId(\\d+)/billingaccount')
    .post((req, res) => {
      const pId = req.params.projectId;
      app.logger.info({ body: req.body, pId }, 'add billingaccount to Project');
      if (projects[pId]) {
        projects[pId] = _.merge(projects[pId], req.body);
        res.json(util.wrapResponse(req.id, { billingAccountName: 'mock account name for ' +
          `${req.body.billingAccountId}` }));
      } else {
        res.json(util.wrapErrorResponse(req.id, 404, `Cannot find direct project ${pId}`));
      }
    });


router.route('/v3/direct/projects/:projectId(\\d+)/copilot')
    .post((req, res) => {
      const pId = req.params.projectId;
      app.logger.info({ body: req.body, pId }, 'add copilot to Project');
      if (projects[pId]) {
        projects[pId] = _.merge(projects[pId], req.body);
        res.json(util.wrapResponse(req.id, { copilotProjectId: pId }));
      } else {
        res.json(util.wrapErrorResponse(req.id, 404, `Cannot find direct project ${pId}`));
      }
    })
    .delete((req, res) => {
      const pId = req.params.projectId;
      app.logger.info({ body: req.body, pId }, 'remove copilot from Project');
      if (projects[pId]) {
        projects[pId] = _.omit(projects[pId], 'copilotUserId');
        res.json(util.wrapResponse(req.id, true));
      } else {
        res.json(util.wrapErrorResponse(req.id, 404, `Cannot find direct project ${pId}`));
      }
    });

router.route('/v3/direct/projects/:projectId(\\d+)/permissions')
    .post((req, res) => {
      const pId = req.params.projectId;
      app.logger.info({ body: req.body, pId }, 'add permissions to Project');
      if (projects[pId]) {
        res.json();
      } else {
        res.json(util.wrapErrorResponse(req.id, 404, `Cannot find direct project ${pId}`));
      }
    });

app.use(router);

// =======================
// start the server ======
// =======================
const port = process.env.DIRECT_PORT || 8443;

const server = https.createServer({
  key: fs.readFileSync(path.join(__dirname, 'key.pem')),
  cert: fs.readFileSync(path.join(__dirname, 'cert.pem')),
  passphrase: '1234',
}, app).listen(port, () => {
  app.logger.info('Starting mock direct server on PORT: %d', port);
});

module.exports = server;
