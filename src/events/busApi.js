import _ from 'lodash';
import 'config';
import { EVENT, BUS_API_EVENT, PROJECT_STATUS, PROJECT_MEMBER_ROLE } from '../constants';
import { createEvent } from '../services/busApi';
import models from '../models';

/**
 * Map of project status and event name sent to bus api
 */
const mapEventTypes = {
  [PROJECT_STATUS.DRAFT]: BUS_API_EVENT.PROJECT_CREATED,
  [PROJECT_STATUS.IN_REVIEW]: BUS_API_EVENT.PROJECT_SUBMITTED_FOR_REVIEW,
  [PROJECT_STATUS.REVIEWED]: BUS_API_EVENT.PROJECT_APPROVED,
  [PROJECT_STATUS.COMPLETED]: BUS_API_EVENT.PROJECT_COMPLETED,
  [PROJECT_STATUS.CANCELLED]: BUS_API_EVENT.PROJECT_CANCELED,
  [PROJECT_STATUS.PAUSED]: BUS_API_EVENT.PROJECT_PAUSED,
  [PROJECT_STATUS.ACTIVE]: BUS_API_EVENT.PROJECT_ACTIVE,
};

module.exports = (app, logger) => {
  /**
   * PROJECT_DRAFT_CREATED
   */
  app.on(EVENT.ROUTING_KEY.PROJECT_DRAFT_CREATED, ({ req, project }) => {
    logger.debug('receive PROJECT_DRAFT_CREATED event');

    // send event to bus api
    createEvent(BUS_API_EVENT.PROJECT_CREATED, {
      projectId: project.id,
      projectName: project.name,
      userId: req.authUser.userId,
      initiatorUserId: req.authUser.userId,
    }, logger);
  });

  /**
   * PROJECT_UPDATED
   */
  app.on(EVENT.ROUTING_KEY.PROJECT_UPDATED, ({ req, original, updated }) => {
    logger.debug('receive PROJECT_UPDATED event');

    if (original.status !== updated.status) {
      logger.debug(`project status is updated from ${original.status} to ${updated.status}`);
      createEvent(mapEventTypes[updated.status], {
        projectId: updated.id,
        projectName: updated.name,
        userId: req.authUser.userId,
        initiatorUserId: req.authUser.userId,
      }, logger);
    } else if (
      !_.isEqual(original.details, updated.details) ||
      !_.isEqual(original.name, updated.name) ||
      !_.isEqual(original.description, updated.description)) {
      logger.debug('project spec is updated');
      createEvent(BUS_API_EVENT.PROJECT_SPECIFICATION_MODIFIED, {
        projectId: updated.id,
        projectName: updated.name,
        userId: req.authUser.userId,
        initiatorUserId: req.authUser.userId,
      }, logger);
    } else if (!_.isEqual(original.bookmarks, updated.bookmarks)) {
      logger.debug('project bookmarks is updated');
      createEvent(BUS_API_EVENT.PROJECT_LINK_CREATED, {
        projectId: updated.id,
        projectName: updated.name,
        userId: req.authUser.userId,
        initiatorUserId: req.authUser.userId,
      }, logger);
    }
  });

  /**
   * PROJECT_MEMBER_ADDED
   */
  app.on(EVENT.ROUTING_KEY.PROJECT_MEMBER_ADDED, ({ req, member }) => {
    logger.debug('receive PROJECT_MEMBER_ADDED event');

    let eventType;
    switch (member.role) {
      case PROJECT_MEMBER_ROLE.MANAGER:
        eventType = BUS_API_EVENT.MEMBER_JOINED_MANAGER;
        break;
      case PROJECT_MEMBER_ROLE.COPILOT:
        eventType = BUS_API_EVENT.MEMBER_JOINED_COPILOT;
        break;
      default:
        eventType = BUS_API_EVENT.MEMBER_JOINED;
        break;
    }
    const projectId = _.parseInt(req.params.projectId);

    models.Project.findOne({
      where: { id: projectId },
    })
    .then((project) => {
      createEvent(eventType, {
        projectId,
        projectName: project.name,
        userId: member.userId,
        initiatorUserId: req.authUser.userId,
      }, logger);
    }).catch(err => null);    // eslint-disable-line no-unused-vars
  });

  /**
   * PROJECT_MEMBER_REMOVED
   */
  app.on(EVENT.ROUTING_KEY.PROJECT_MEMBER_REMOVED, ({ req, member }) => {
    logger.debug('receive PROJECT_MEMBER_REMOVED event');

    let eventType;
    if (member.userId === req.authUser.userId) {
      eventType = BUS_API_EVENT.MEMBER_LEFT;
    } else {
      eventType = BUS_API_EVENT.MEMBER_REMOVED;
    }
    const projectId = _.parseInt(req.params.projectId);

    models.Project.findOne({
      where: { id: projectId },
    })
    .then((project) => {
      if (project) {
        createEvent(eventType, {
          projectId,
          projectName: project.name,
          userId: member.userId,
          initiatorUserId: req.authUser.userId,
        }, logger);
      }
    }).catch(err => null);    // eslint-disable-line no-unused-vars
  });

  /**
   * PROJECT_MEMBER_UPDATED
   */
  app.on(EVENT.ROUTING_KEY.PROJECT_MEMBER_UPDATED, ({ req, original, updated }) => {    // eslint-disable-line no-unused-vars
    logger.debug('receive PROJECT_MEMBER_UPDATED event');

    const projectId = _.parseInt(req.params.projectId);
    if (updated.isPrimary && !original.isPrimary) {
      models.Project.findOne({
        where: { id: projectId },
      })
      .then((project) => {
        if (project) {
          createEvent(BUS_API_EVENT.MEMBER_ASSIGNED_AS_OWNER, {
            projectId,
            projectName: project.name,
            userId: updated.userId,
            initiatorUserId: req.authUser.userId,
          }, logger);
        }
      }).catch(err => null);    // eslint-disable-line no-unused-vars
    }
  });

  /**
   * PROJECT_ATTACHMENT_ADDED
   */
  app.on(EVENT.ROUTING_KEY.PROJECT_ATTACHMENT_ADDED, ({ req, attachment }) => {
    logger.debug('receive PROJECT_ATTACHMENT_ADDED event');

    const projectId = _.parseInt(req.params.projectId);

    models.Project.findOne({
      where: { id: projectId },
    })
    .then((project) => {
      createEvent(BUS_API_EVENT.PROJECT_FILE_UPLOADED, {
        projectId,
        projectName: project.name,
        fileName: attachment.filePath.replace(/^.*[\\\/]/, ''),    // eslint-disable-line
        userId: req.authUser.userId,
        initiatorUserId: req.authUser.userId,
      }, logger);
    }).catch(err => null);    // eslint-disable-line no-unused-vars
  });
};
