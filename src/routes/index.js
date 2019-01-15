
import _ from 'lodash';
import config from 'config';
import validate from 'express-validation';
import { Router } from 'express';
import compression from 'compression';

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

router.route('/v4/projects/metadata/projectTemplates')
  .get(require('./projectTemplates/list'));
router.route('/v4/projects/metadata/projectTemplates/:templateId(\\d+)')
  .get(require('./projectTemplates/get'));

router.route('/v4/projects/metadata/productTemplates')
  .get(require('./productTemplates/list'));
router.route('/v4/projects/metadata/productTemplates/:templateId(\\d+)')
  .get(require('./productTemplates/get'));

router.route('/v4/projects/metadata/projectTypes')
  .get(require('./projectTypes/list'));
router.route('/v4/projects/metadata/projectTypes/:key')
  .get(require('./projectTypes/get'));

router.route('/v4/projects/metadata/productCategories')
  .get(require('./productCategories/list'));
router.route('/v4/projects/metadata/productCategories/:key')
  .get(require('./productCategories/get'));


router.use('/v4/projects/metadata', compression());
router.route('/v4/projects/metadata')
  .get(require('./metadata/list'));

router.all(
  RegExp(`\\/${apiVersion}\\/(projects|timelines)(?!\\/health).*`), (req, res, next) => (
    // JWT authentication
    jwtAuth(config)(req, res, next)
  ),
);

// Register all the routes
router.use('/v4/projects', compression());
router.route('/v4/projects')
  .post(require('./projects/create'))
  .get(require('./projects/list'));

router.use('/v4/projects/db', compression());
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

router.route('/v4/projects/:projectId(\\d+)/upgrade')
  .post(require('./projectUpgrade/create'));

router.route('/v4/projects/metadata/projectTemplates')
  .post(require('./projectTemplates/create'));

router.route('/v4/projects/metadata/projectTemplates/:templateId(\\d+)')
  .patch(require('./projectTemplates/update'))
  .delete(require('./projectTemplates/delete'));

router.route('/v4/projects/metadata/productTemplates')
  .post(require('./productTemplates/create'));

router.route('/v4/projects/metadata/productTemplates/:templateId(\\d+)')
  .patch(require('./productTemplates/update'))
  .delete(require('./productTemplates/delete'));

router.route('/v4/projects/:projectId(\\d+)/phases')
  .get(require('./phases/list'))
  .post(require('./phases/create'));

router.route('/v4/projects/:projectId(\\d+)/phases/:phaseId(\\d+)')
  .get(require('./phases/get'))
  .patch(require('./phases/update'))
  .delete(require('./phases/delete'));

router.route('/v4/projects/:projectId(\\d+)/phases/:phaseId(\\d+)/products')
  .get(require('./phaseProducts/list'))
  .post(require('./phaseProducts/create'));

router.route('/v4/projects/:projectId(\\d+)/phases/:phaseId(\\d+)/products/:productId(\\d+)')
  .get(require('./phaseProducts/get'))
  .patch(require('./phaseProducts/update'))
  .delete(require('./phaseProducts/delete'));

router.route('/v4/projects/metadata/productCategories')
  .post(require('./productCategories/create'));

router.route('/v4/projects/metadata/productCategories/:key')
  .patch(require('./productCategories/update'))
  .delete(require('./productCategories/delete'));

router.route('/v4/projects/metadata/projectTypes')
  .post(require('./projectTypes/create'));

router.route('/v4/projects/metadata/projectTypes/:key')
  .patch(require('./projectTypes/update'))
  .delete(require('./projectTypes/delete'));

router.route('/v4/timelines')
  .post(require('./timelines/create'))
  .get(require('./timelines/list'));

router.route('/v4/timelines/:timelineId(\\d+)')
  .get(require('./timelines/get'))
  .patch(require('./timelines/update'))
  .delete(require('./timelines/delete'));

router.route('/v4/timelines/:timelineId(\\d+)/milestones')
  .post(require('./milestones/create'))
  .get(require('./milestones/list'));

router.route('/v4/timelines/:timelineId(\\d+)/milestones/:milestoneId(\\d+)')
  .get(require('./milestones/get'))
  .patch(require('./milestones/update'))
  .delete(require('./milestones/delete'));

router.route('/v4/timelines/metadata/milestoneTemplates')
  .post(require('./milestoneTemplates/create'))
  .get(require('./milestoneTemplates/list'));

router.route('/v4/timelines/metadata/milestoneTemplates/clone')
  .post(require('./milestoneTemplates/clone'));

router.route('/v4/timelines/metadata/milestoneTemplates/:milestoneTemplateId(\\d+)')
  .get(require('./milestoneTemplates/get'))
  .patch(require('./milestoneTemplates/update'))
  .delete(require('./milestoneTemplates/delete'));

router.route('/v4/projects/:projectId(\\d+)/members/invite')
  .post(require('./projectMemberInvites/create'))
  .put(require('./projectMemberInvites/update'))
  .get(require('./projectMemberInvites/get'));

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
