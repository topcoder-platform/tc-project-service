
import _ from 'lodash';
import config from 'config';
import validate from 'express-validation';
import { Router } from 'express';
import compression from 'compression';

const router = Router();

const apiVersion = config.apiVersion;

validate.options({
  status: 400,
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

router.all(
  RegExp(`\\/${apiVersion}\\/(projects|timelines|orgConfig)(?!\\/health).*`), (req, res, next) => (
    // JWT authentication
    jwtAuth(config)(req, res, next)
  ),
);

router.all(
  RegExp(`\\/${apiVersion}\\/.*`), (req, res, next) => {
    // if it is an M2M call, hard code user id to a deafult value to avoid errors
    // Ideally, the m2m token should have unique userId, which may not be an actual user, as well
    const isMachineToken = _.get(req, 'authUser.isMachine', false);
    if (req.authUser && !req.authUser.userId && isMachineToken) {
      req.authUser.userId = config.DEFAULT_M2M_USERID;
    }
    return next();
  },
);

router.route('/v5/projects/metadata/projectTemplates')
  .get(require('./projectTemplates/list'));
router.route('/v5/projects/metadata/projectTemplates/:templateId(\\d+)')
  .get(require('./projectTemplates/get'));

router.route('/v5/projects/metadata/productTemplates')
  .get(require('./productTemplates/list'));
router.route('/v5/projects/metadata/productTemplates/:templateId(\\d+)')
  .get(require('./productTemplates/get'));
router.route('/v5/projects/metadata/productTemplates/:templateId(\\d+)/upgrade')
  .post(require('./productTemplates/upgrade'));

router.route('/v5/projects/metadata/projectTypes')
  .get(require('./projectTypes/list'));
router.route('/v5/projects/metadata/projectTypes/:key')
  .get(require('./projectTypes/get'));

router.route('/v5/projects/metadata/projectTemplates/:templateId(\\d+)/upgrade')
  .post(require('./projectTemplates/upgrade'));

router.route('/v5/projects/metadata/orgConfig')
  .get(require('./orgConfig/list'));

router.route('/v5/projects/metadata/orgConfig/:id(\\d+)')
  .get(require('./orgConfig/get'));

router.route('/v5/projects/metadata/productCategories')
  .get(require('./productCategories/list'));
router.route('/v5/projects/metadata/productCategories/:key')
  .get(require('./productCategories/get'));

router.route('/v5/projects/metadata/workManagementPermission')
  .get(require('./workManagementPermissions/list'));
router.route('/v5/projects/metadata/workManagementPermission/:id')
  .get(require('./workManagementPermissions/get'));


router.use('/v5/projects/metadata', compression());
router.route('/v5/projects/metadata')
  .get(require('./metadata/list'));

// Register all the routes
router.use('/v5/projects', compression());
router.route('/v5/projects')
  .post(require('./projects/create'))
  .get(require('./projects/list'));

router.route('/v5/projects/admin/es/createIndex')
  .post(require('./admin/es-create-index'));
router.route('/v5/projects/admin/es/deleteIndex')
  .delete(require('./admin/es-delete-index'));
router.route('/v5/projects/admin/es/migrateFromDb')
  .patch(require('./admin/es-migrate-from-db'));
router.route('/v5/projects/admin/es/fixMetadataForEs')
  .patch(require('./admin/es-fix-metadata-for-es'));
router.route('/v5/projects/admin/es/fixProjectsForEs')
  .patch(require('./admin/es-fix-projects-for-es'));
router.route('/v5/projects/admin/es/project/index')
  .post(require('./admin/project-index-create'));
router.route('/v5/projects/admin/es/project/remove')
  .delete(require('./admin/project-index-delete'));

router.route('/v5/projects/:projectId(\\d+)')
  .get(require('./projects/get'))
  .patch(require('./projects/update'))
  .delete(require('./projects/delete'));

router.route('/v5/projects/:projectId(\\d+)/scopeChangeRequests')
  .post(require('./scopeChangeRequests/create'));
// .get(require('./scopeChangeRequests/list'));
router.route('/v5/projects/:projectId(\\d+)/scopeChangeRequests/:requestId(\\d+)')
  // .get(require('./scopeChangeRequests/get'))
  .patch(require('./scopeChangeRequests/update'));
// .delete(require('./scopeChangeRequests/delete'));

router.route('/v5/projects/:projectId(\\d+)/members')
  .get(require('./projectMembers/list'))
  .post(require('./projectMembers/create'));

router.route('/v5/projects/:projectId(\\d+)/members/:id(\\d+)')
  .get(require('./projectMembers/get'))
  .delete(require('./projectMembers/delete'))
  .patch(require('./projectMembers/update'));

// Permissions
router.route('/v5/projects/:projectId(\\d+)/permissions')
  .get(require('./permissions/get'));

router.route('/v5/projects/:projectId(\\d+)/attachments')
  .post(require('./attachments/create'))
  .get(require('./attachments/list'));

router.route('/v5/projects/:projectId(\\d+)/attachments/:id(\\d+)')
  .get(require('./attachments/get'))
  .patch(require('./attachments/update'))
  .delete(require('./attachments/delete'));

router.route('/v5/projects/:projectId(\\d+)/upgrade')
  .post(require('./projectUpgrade/create'));

router.route('/v5/projects/metadata/projectTemplates')
  .post(require('./projectTemplates/create'));

router.route('/v5/projects/metadata/projectTemplates/:templateId(\\d+)')
  .patch(require('./projectTemplates/update'))
  .delete(require('./projectTemplates/delete'));

router.route('/v5/projects/metadata/productTemplates')
  .post(require('./productTemplates/create'));

router.route('/v5/projects/metadata/productTemplates/:templateId(\\d+)')
  .patch(require('./productTemplates/update'))
  .delete(require('./productTemplates/delete'));

router.route('/v5/projects/:projectId(\\d+)/phases')
  .get(require('./phases/list'))
  .post(require('./phases/create'));

router.route('/v5/projects/:projectId(\\d+)/phases/:phaseId(\\d+)')
  .get(require('./phases/get'))
  .patch(require('./phases/update'))
  .delete(require('./phases/delete'));

router.route('/v5/projects/:projectId(\\d+)/phases/:phaseId(\\d+)/products')
  .get(require('./phaseProducts/list'))
  .post(require('./phaseProducts/create'));

router.route('/v5/projects/:projectId(\\d+)/phases/:phaseId(\\d+)/products/:productId(\\d+)')
  .get(require('./phaseProducts/get'))
  .patch(require('./phaseProducts/update'))
  .delete(require('./phaseProducts/delete'));

router.route('/v5/projects/metadata/productCategories')
  .post(require('./productCategories/create'));

router.route('/v5/projects/metadata/productCategories/:key')
  .patch(require('./productCategories/update'))
  .delete(require('./productCategories/delete'));

router.route('/v5/projects/metadata/workManagementPermission')
  .post(require('./workManagementPermissions/create'));

router.route('/v5/projects/metadata/workManagementPermission/:id')
  .patch(require('./workManagementPermissions/update'))
  .delete(require('./workManagementPermissions/delete'));

router.route('/v5/projects/metadata/projectTypes')
  .post(require('./projectTypes/create'));

router.route('/v5/projects/metadata/projectTypes/:key')
  .patch(require('./projectTypes/update'))
  .delete(require('./projectTypes/delete'));

router.route('/v5/timelines')
  .post(require('./timelines/create'))
  .get(require('./timelines/list'));

router.route('/v5/timelines/:timelineId(\\d+)')
  .get(require('./timelines/get'))
  .patch(require('./timelines/update'))
  .delete(require('./timelines/delete'));

router.route('/v5/timelines/:timelineId(\\d+)/milestones')
  .post(require('./milestones/create'))
  .patch(require('./milestones/bulkUpdate'))
  .get(require('./milestones/list'));

router.route('/v5/timelines/:timelineId(\\d+)/milestones/:milestoneId(\\d+)')
  .get(require('./milestones/get'))
  .patch(require('./milestones/update'))
  .delete(require('./milestones/delete'));

router.route('/v5/timelines/metadata/milestoneTemplates')
  .post(require('./milestoneTemplates/create'))
  .get(require('./milestoneTemplates/list'));

router.route('/v5/timelines/metadata/milestoneTemplates/clone')
  .post(require('./milestoneTemplates/clone'));

router.route('/v5/timelines/metadata/milestoneTemplates/:milestoneTemplateId(\\d+)')
  .get(require('./milestoneTemplates/get'))
  .patch(require('./milestoneTemplates/update'))
  .delete(require('./milestoneTemplates/delete'));

router.route('/v5/projects/:projectId(\\d+)/invites')
  .get(require('./projectMemberInvites/list'))
  .post(require('./projectMemberInvites/create'));

router.route('/v5/projects/:projectId(\\d+)/invites/:inviteId(\\d+)')
  .patch(require('./projectMemberInvites/update'))
  .get(require('./projectMemberInvites/get'))
  .delete(require('./projectMemberInvites/delete'));

router.route('/v5/projects/metadata/orgConfig')
  .post(require('./orgConfig/create'));

router.route('/v5/projects/metadata/orgConfig/:id(\\d+)')
  .patch(require('./orgConfig/update'))
  .delete(require('./orgConfig/delete'));

// form

router.route('/v5/projects/metadata/form/:key/versions/:version(\\d+)/revisions/:revision(\\d+)')
  .get(require('./form/revision/get'))
  .delete(require('./form/revision/delete'));

router.route('/v5/projects/metadata/form/:key/versions/:version(\\d+)/revisions')
  .get(require('./form/revision/list'))
  .post(require('./form/revision/create'));

router.route('/v5/projects/metadata/form/:key')
  .get(require('./form/version/get'));

router.route('/v5/projects/metadata/form/:key/versions')
  .get(require('./form/version/list'))
  .post(require('./form/version/create'));

router.route('/v5/projects/metadata/form/:key/versions/:version(\\d+)')
  .get(require('./form/version/getVersion'))
  .patch(require('./form/version/update'))
  .delete(require('./form/version/delete'));

// price config

router.route('/v5/projects/metadata/priceConfig/:key/versions/:version(\\d+)/revisions/:revision(\\d+)')
  .get(require('./priceConfig/revision/get'))
  .delete(require('./priceConfig/revision/delete'));

router.route('/v5/projects/metadata/priceConfig/:key/versions/:version(\\d+)/revisions')
  .get(require('./priceConfig/revision/list'))
  .post(require('./priceConfig/revision/create'));

router.route('/v5/projects/metadata/priceConfig/:key')
  .get(require('./priceConfig/version/get'));

router.route('/v5/projects/metadata/priceConfig/:key/versions')
  .get(require('./priceConfig/version/list'))
  .post(require('./priceConfig/version/create'));

router.route('/v5/projects/metadata/priceConfig/:key/versions/:version(\\d+)')
  .get(require('./priceConfig/version/getVersion'))
  .patch(require('./priceConfig/version/update'))
  .delete(require('./priceConfig/version/delete'));

// plan config
router.route('/v5/projects/metadata/planConfig/:key/versions/:version(\\d+)/revisions/:revision(\\d+)')
  .get(require('./planConfig/revision/get'))
  .delete(require('./planConfig/revision/delete'));

router.route('/v5/projects/metadata/planConfig/:key/versions/:version(\\d+)/revisions')
  .get(require('./planConfig/revision/list'))
  .post(require('./planConfig/revision/create'));

router.route('/v5/projects/metadata/planConfig/:key')
  .get(require('./planConfig/version/get'));

router.route('/v5/projects/metadata/planConfig/:key/versions')
  .get(require('./planConfig/version/list'))
  .post(require('./planConfig/version/create'));

router.route('/v5/projects/metadata/planConfig/:key/versions/:version(\\d+)')
  .get(require('./planConfig/version/getVersion'))
  .patch(require('./planConfig/version/update'))
  .delete(require('./planConfig/version/delete'));

// user level reports
router.route('/v5/projects/reports/embed')
  .get(require('./userReports/getEmbedReport'));

// work streams
router.route('/v5/projects/:projectId(\\d+)/workstreams')
  .get(require('./workStreams/list'))
  .post(require('./workStreams/create'));

router.route('/v5/projects/:projectId(\\d+)/workstreams/:id(\\d+)')
  .get(require('./workStreams/get'))
  .patch(require('./workStreams/update'))
  .delete(require('./workStreams/delete'));

// works
router.route('/v5/projects/:projectId(\\d+)/workstreams/:workStreamId(\\d+)/works')
  .get(require('./works/list'))
  .post(require('./works/create'));

router.route('/v5/projects/:projectId(\\d+)/workstreams/:workStreamId(\\d+)/works/:id(\\d+)')
  .get(require('./works/get'))
  .patch(require('./works/update'))
  .delete(require('./works/delete'));

// work items
router.route('/v5/projects/:projectId(\\d+)/workstreams/:workStreamId(\\d+)/works/:workId(\\d+)/workitems')
  .get(require('./workItems/list'))
  .post(require('./workItems/create'));

router.route('/v5/projects/:projectId(\\d+)/workstreams/:workStreamId(\\d+)/works/:workId(\\d+)/workitems/:id(\\d+)')
  .get(require('./workItems/get'))
  .patch(require('./workItems/update'))
  .delete(require('./workItems/delete'));


router.route('/v5/projects/:projectId/reports/embed')
  .get(require('./projectReports/getEmbedReport'));

router.route('/v5/projects/:projectId/reports')
  .get(require('./projectReports/getReport'));

// Project Settings
router.route('/v5/projects/:projectId(\\d+)/settings/:id(\\d+)')
  .patch(require('./projectSettings/update'))
  .delete(require('./projectSettings/delete'));

router.route('/v5/projects/:projectId(\\d+)/settings')
  .get(require('./projectSettings/list'))
  .post(require('./projectSettings/create'));

// Project Estimation Items
router.route('/v5/projects/:projectId(\\d+)/estimations/:estimationId(\\d+)/items')
  .get(require('./projectEstimationItems/list'));

// register error handler
router.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  // DO NOT REMOVE next arg.. even though eslint
  // complains that it is not being used.
  const content = {};
  // specific for validation errors
  if (err instanceof validate.ValidationError) {
    content.message = `${err.message}: ${err.toJSON()}`;
  } else {
    content.message = err.message;
  }

  // dvalidateelopment error handler
  // will print stacktrace
  if (_.indexOf(['development', 'test', 'qa'], process.env.NODE_ENV) > -1) {
    // body.result.debug = err.stack;
    content.debug = err.stack;
    if (err.details) {
      content.details = err.details;
    }
  }
  const rerr = err;
  rerr.status = rerr.status || 500;
  req.log.error(rerr);
  res.status(rerr.status).send(content);
});

// catch 404 and forward to error handler
router.use((req, res, next) => {
  const err = new Error('Not Found');
  err.status = 404;
  next(err);
});

module.exports = router;
