import _ from 'lodash';
import config from 'config';
import { EVENT, BUS_API_EVENT } from '../constants';
import { createEvent } from '../services/busApi';

/**
 * Builds the connect project url for the given project id.
 *
 * @param {string|number} projectId the project id
 * @returns {string} the connect project url
 */
function connectProjectUrl(projectId) {
  return `${config.get('connectProjectsUrl')}${projectId}`;
}

module.exports = (app, logger) => {
  /**
   * PROJECT_DRAFT_CREATED
   */
  app.on(EVENT.ROUTING_KEY.PROJECT_DRAFT_CREATED, ({ req, project }) => { // eslint-disable-line no-unused-vars
    logger.debug('receive PROJECT_DRAFT_CREATED event');

    // send event to bus api
    createEvent(BUS_API_EVENT.PROJECT_CREATED, _.assign(project, {
      refCode: _.get(project, 'details.utm.code'),
      projectUrl: connectProjectUrl(project.id),
    }), logger);
  });

  /**
   * PROJECT_UPDATED
   */
  app.on(EVENT.ROUTING_KEY.PROJECT_UPDATED, ({ req, updated }) => { // eslint-disable-line no-unused-vars
    logger.debug('receive PROJECT_UPDATED event');

    createEvent(BUS_API_EVENT.PROJECT_UPDATED, _.assign(updated, {
      refCode: _.get(updated, 'details.utm.code'),
      projectUrl: connectProjectUrl(updated.id),
    }), logger);
  });

  /**
   * PROJECT_DELETED
   */
  app.on(EVENT.ROUTING_KEY.PROJECT_DELETED, ({ req, project }) => { // eslint-disable-line no-unused-vars
    logger.debug('receive PROJECT_DELETED event');

    createEvent(BUS_API_EVENT.PROJECT_DELETED, project, logger);
  });

  /**
   * PROJECT_METADATA_CREATE
   */
  app.on(EVENT.ROUTING_KEY.PROJECT_METADATA_CREATE, ({ req, resource }) => {  // eslint-disable-line no-unused-vars
    logger.debug('receive PROJECT_METADATA_CREATE event');

    // send event to bus api
    createEvent(BUS_API_EVENT.PROJECT_METADATA_CREATE, resource, logger);
  });

  /**
   * PROJECT_METADATA_UPDATE
   */
  app.on(EVENT.ROUTING_KEY.PROJECT_METADATA_UPDATE, ({ req, resource }) => {  // eslint-disable-line no-unused-vars
    logger.debug('receive PROJECT_METADATA_UPDATE event');

    createEvent(BUS_API_EVENT.PROJECT_METADATA_UPDATE, resource, logger);
  });

  /**
   * PROJECT_METADATA_DELETE
   */
  app.on(EVENT.ROUTING_KEY.PROJECT_METADATA_DELETE, ({ req, resource }) => {  // eslint-disable-line no-unused-vars
    logger.debug('receive PROJECT_METADATA_DELETE event');

    createEvent(BUS_API_EVENT.PROJECT_METADATA_DELETE, resource, logger);
  });

  /**
   * PROJECT_MEMBER_ADDED
   */
  app.on(EVENT.ROUTING_KEY.PROJECT_MEMBER_ADDED, ({ req, resource }) => { // eslint-disable-line no-unused-vars
    logger.debug('receive PROJECT_MEMBER_ADDED event');

    createEvent(BUS_API_EVENT.PROJECT_MEMBER_ADDED, resource, logger);
  });

  /**
   * PROJECT_MEMBER_REMOVED
   */
  app.on(EVENT.ROUTING_KEY.PROJECT_MEMBER_REMOVED, ({ req, resource }) => { // eslint-disable-line no-unused-vars
    logger.debug('receive PROJECT_MEMBER_REMOVED event');

    createEvent(BUS_API_EVENT.PROJECT_MEMBER_REMOVED, resource, logger);
  });

  /**
   * PROJECT_MEMBER_UPDATED
   */
  app.on(EVENT.ROUTING_KEY.PROJECT_MEMBER_UPDATED, ({ req, resource }) => {    // eslint-disable-line no-unused-vars
    logger.debug('receive PROJECT_MEMBER_UPDATED event');

    createEvent(BUS_API_EVENT.PROJECT_MEMBER_UPDATED, resource, logger);
  });

  /**
   * PROJECT_ATTACHMENT_ADDED
   */
  app.on(EVENT.ROUTING_KEY.PROJECT_ATTACHMENT_ADDED, ({ req, resource }) => { // eslint-disable-line no-unused-vars
    logger.debug('receive PROJECT_ATTACHMENT_ADDED event');

    createEvent(BUS_API_EVENT.PROJECT_ATTACHMENT_ADDED, resource, logger);
  });

  /**
   * PROJECT_ATTACHMENT_UPDATED
   */
  app.on(EVENT.ROUTING_KEY.PROJECT_ATTACHMENT_UPDATED, ({ req, resource }) => { // eslint-disable-line no-unused-vars
    logger.debug('receive PROJECT_ATTACHMENT_UPDATED event');

    createEvent(BUS_API_EVENT.PROJECT_ATTACHMENT_UPDATED, resource, logger);
  });

  /**
   * PROJECT_ATTACHMENT_REMOVED
   */
  app.on(EVENT.ROUTING_KEY.PROJECT_ATTACHMENT_REMOVED, ({ req, resource }) => { // eslint-disable-line no-unused-vars
    logger.debug('receive PROJECT_ATTACHMENT_REMOVED event');

    createEvent(BUS_API_EVENT.PROJECT_ATTACHMENT_REMOVED, resource, logger);
  });

  /**
   * PROJECT_PHASE_ADDED
   */
  app.on(EVENT.ROUTING_KEY.PROJECT_PHASE_ADDED, ({ req, resource }) => { // eslint-disable-line no-unused-vars
    logger.debug('receive PROJECT_PHASE_ADDED event');

    createEvent(BUS_API_EVENT.PROJECT_PHASE_CREATED, resource, logger);
  });

  /**
  * PROJECT_PHASE_REMOVED
  */
  app.on(EVENT.ROUTING_KEY.PROJECT_PHASE_REMOVED, ({ req, resource }) => { // eslint-disable-line no-unused-vars
    logger.debug('receive PROJECT_PHASE_REMOVED event');

    createEvent(BUS_API_EVENT.PROJECT_PHASE_DELETED, resource, logger);
  });

  /**
  * PROJECT_PHASE_UPDATED
  */
  app.on(EVENT.ROUTING_KEY.PROJECT_PHASE_UPDATED, ({ req, resource }) => { // eslint-disable-line no-unused-vars
    logger.debug('receive PROJECT_PHASE_UPDATED event');

    createEvent(BUS_API_EVENT.PROJECT_PHASE_UPDATED, resource, logger);
  });

  /**
   * MILESTONE_ADDED.
   */
  app.on(EVENT.ROUTING_KEY.MILESTONE_ADDED, ({ req, resource }) => {  // eslint-disable-line no-unused-vars
    logger.debug('receive MILESTONE_ADDED event');

    createEvent(BUS_API_EVENT.MILESTONE_ADDED, resource, logger);
  });

  /**
  * MILESTONE_UPDATED.
  */
  app.on(EVENT.ROUTING_KEY.MILESTONE_UPDATED, ({ req, resource }) => {  // eslint-disable-line no-unused-vars
    logger.debug(`receive MILESTONE_UPDATED event for milestone ${resource.id}`);

    createEvent(BUS_API_EVENT.MILESTONE_UPDATED, resource, logger);
  });

 /**
  * MILESTONE_REMOVED.
  */
  app.on(EVENT.ROUTING_KEY.MILESTONE_REMOVED, ({ req, resource }) => {  // eslint-disable-line no-unused-vars
    logger.debug('receive MILESTONE_REMOVED event');

    createEvent(BUS_API_EVENT.MILESTONE_REMOVED, resource, logger);
  });

  /**
   * MILESTONE_TEMPLATE_ADDED.
   */
  app.on(EVENT.ROUTING_KEY.MILESTONE_TEMPLATE_ADDED, ({ req, resource }) => { // eslint-disable-line no-unused-vars
    logger.debug('receive MILESTONE_ADDED event');

    createEvent(BUS_API_EVENT.MILESTONE_TEMPLATE_ADDED, resource, logger);
  });

  /**
  * MILESTONE_TEMPLATE_UPDATED.
  */
  app.on(EVENT.ROUTING_KEY.MILESTONE_TEMPLATE_UPDATED, ({ req, resource }) => { // eslint-disable-line no-unused-vars
    logger.debug(`receive MILESTONE_TEMPLATE_UPDATED event for milestone ${resource.id}`);

    createEvent(BUS_API_EVENT.MILESTONE_TEMPLATE_UPDATED, resource, logger);
  });

 /**
  * MILESTONE_TEMPLATE_REMOVED.
  */
  app.on(EVENT.ROUTING_KEY.MILESTONE_TEMPLATE_REMOVED, ({ req, resource }) => { // eslint-disable-line no-unused-vars
    logger.debug('receive MILESTONE_TEMPLATE_REMOVED event');

    createEvent(BUS_API_EVENT.MILESTONE_TEMPLATE_REMOVED, resource, logger);
  });

  /**
   * TIMELINE_ADDED
   */
  app.on(EVENT.ROUTING_KEY.TIMELINE_ADDED, ({ req, resource }) => { // eslint-disable-line no-unused-vars
    logger.debug('receive TIMELINE_ADDED event');

    createEvent(BUS_API_EVENT.TIMELINE_CREATED, resource, logger);
  });

  /**
   * TIMELINE_REMOVED
   */
  app.on(EVENT.ROUTING_KEY.TIMELINE_REMOVED, ({ req, resource }) => { // eslint-disable-line no-unused-vars
    logger.debug('receive TIMELINE_REMOVED event');

    createEvent(BUS_API_EVENT.TIMELINE_DELETED, resource, logger);
  });

  /**
   * TIMELINE_UPDATED
   */
  app.on(EVENT.ROUTING_KEY.TIMELINE_UPDATED, ({ req, resource }) => { // eslint-disable-line no-unused-vars
    logger.debug('receive TIMELINE_UPDATED event');

    createEvent(BUS_API_EVENT.TIMELINE_UPDATED, resource, logger);
  });

  /**
   * PROJECT_PHASE_PRODUCT_ADDED
   */
  app.on(EVENT.ROUTING_KEY.PROJECT_PHASE_PRODUCT_ADDED, ({ req, resource }) => { // eslint-disable-line no-unused-vars
    logger.debug('receive PROJECT_PHASE_PRODUCT_ADDED event');

    createEvent(BUS_API_EVENT.TIMELINE_CREATED, resource, logger);
  });

  /**
   * PROJECT_PHASE_PRODUCT_REMOVED
   */
  app.on(EVENT.ROUTING_KEY.PROJECT_PHASE_PRODUCT_REMOVED, ({ req, resource }) => { // eslint-disable-line no-unused-vars
    logger.debug('receive PROJECT_PHASE_PRODUCT_REMOVED event');

    createEvent(BUS_API_EVENT.PROJECT_PHASE_PRODUCT_REMOVED, resource, logger);
  });

  /**
   * PROJECT_PHASE_PRODUCT_UPDATED
   */
  app.on(EVENT.ROUTING_KEY.PROJECT_PHASE_PRODUCT_UPDATED, ({ req, resource }) => { // eslint-disable-line no-unused-vars
    logger.debug('receive PROJECT_PHASE_PRODUCT_UPDATED event');

    createEvent(BUS_API_EVENT.PROJECT_PHASE_PRODUCT_UPDATED, resource, logger);
  });

  /**
   * PROJECT_MEMBER_INVITE_CREATED
   */
  app.on(EVENT.ROUTING_KEY.PROJECT_MEMBER_INVITE_CREATED, ({ req, resource }) => {  // eslint-disable-line no-unused-vars
    logger.debug('receive PROJECT_MEMBER_INVITE_CREATED event');

    createEvent(BUS_API_EVENT.PROJECT_MEMBER_INVITE_CREATED, resource, logger);
  });

  /**
   * PROJECT_MEMBER_INVITE_UPDATED
   */
  app.on(EVENT.ROUTING_KEY.PROJECT_MEMBER_INVITE_UPDATED, ({ req, resource }) => {  // eslint-disable-line no-unused-vars
    logger.debug('receive PROJECT_MEMBER_INVITE_UPDATED event');

    createEvent(BUS_API_EVENT.PROJECT_MEMBER_INVITE_UPDATED, resource, logger);
  });

  /**
   * PROJECT_MEMBER_INVITE_REMOVED
   */
  app.on(EVENT.ROUTING_KEY.PROJECT_MEMBER_INVITE_REMOVED, ({ req, resource }) => {  // eslint-disable-line no-unused-vars
    logger.debug('receive PROJECT_MEMBER_INVITE_REMOVED event');

    createEvent(BUS_API_EVENT.PROJECT_MEMBER_INVITE_REMOVED, resource, logger);
  });
};
