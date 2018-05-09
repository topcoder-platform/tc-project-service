
import _ from 'lodash';
import config from 'config';
import validate from 'express-validation';
import { Router } from 'express';

const router = Router();

const apiVersion = config.apiVersion;

validate.options({
  status: 422,
  flatten: true,
  allowUnknownBody: false,
});

// health check
router.get(`/${apiVersion}/projects/health`, (req, res) => {
  // TODO more checks
  res.status(200).send({
    message: 'All-is-well',
  });
});


// All project service endpoints need authentication
const jwtAuth = require('tc-core-library-js').middleware.jwtAuthenticator;

router.all(RegExp(`\\/${apiVersion}\\/projects(?!\\/health).*`), jwtAuth());

// Register all the routes
router.route('/v4/projects')
  .post(require('./projects/create'))
  .get(require('./projects/list'));

router.route('/v4/projects/db')
  .get(require('./projects/list-db'));

router.route('/v4/projects/admin/es/project/createIndex')
  .post(require('./admin/project-create-index'));
router.route('/v4/projects/admin/es/project/deleteIndex')
  .delete(require('./admin/project-delete-index'));
router.route('/v4/projects/admin/es/project/index')
  .post(require('./admin/project-index-create'));
router.route('/v4/projects/admin/es/project/remove')
  .delete(require('./admin/project-index-delete'));

router.route('/v4/projects/:projectId(\\d+)')
  .get(require('./projects/get'))
  .patch(require('./projects/update'))
  .delete(require('./projects/delete'));

router.route('/v4/projects/:projectId(\\d+)/members')
    .post(require('./projectMembers/create'));

router.route('/v4/projects/:projectId(\\d+)/members/:id(\\d+)')
    .delete(require('./projectMembers/delete'))
    .patch(require('./projectMembers/update'));

router.route('/v4/projects/:projectId(\\d+)/attachments')
    .post(require('./attachments/create'));
router.route('/v4/projects/:projectId(\\d+)/attachments/:id(\\d+)')
    .get(require('./attachments/download'))
    .patch(require('./attachments/update'))
    .delete(require('./attachments/delete'));


// register error handler
router.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  // DO NOT REMOVE next arg.. even though eslint
  // complains that it is not being used.
  const content = {};
  let httpStatus = err.status || 500;
  // specific for validation errors
  if (err instanceof validate.ValidationError) {
    content.message = `${err.message}: ${err.toJSON()}`;
    httpStatus = err.status;
  } else {
    content.message = err.message;
  }
  const body = {
    id: req.id,
    result: {
      success: false,
      status: httpStatus,
      content,
    },
  };

  // dvalidateelopment error handler
  // will print stacktrace
  if (_.indexOf(['development', 'test', 'qa'], process.env.NODE_ENV) > -1) {
    body.result.debug = err.stack;
    if (err.details) {
      body.result.details = err.details;
    }
  }
  const rerr = err;
  rerr.status = rerr.status || 500;
  req.log.error(rerr);
  res.status(rerr.status).send(body);
});

// catch 404 and forward to error handler
router.use((req, res, next) => {
  const err = new Error('Not Found');
  err.status = 404;
  next(err);
});

module.exports = router;
