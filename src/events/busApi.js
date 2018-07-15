import _ from 'lodash';
import 'config';
import { EVENT, BUS_API_EVENT, PROJECT_STATUS, PROJECT_PHASE_STATUS, PROJECT_MEMBER_ROLE } from '../constants';
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

  /**
   * If the project is in draft status and the phase is in reviewed status, and it's the
   * only phase in the project with that status, then send the plan ready event.
   *
   * @param req the req
   * @param project the project
   * @param phase the phase that was created/updated
   * @returns {Promise<void>}
   */
  async function sendPlanReadyEventIfNeeded(req, project, phase) {
    if (project.status === PROJECT_STATUS.DRAFT &&
      phase.status === PROJECT_PHASE_STATUS.REVIEWED) {
      await models.ProjectPhase.count({
        where: { projectId: project.id, status: PROJECT_PHASE_STATUS.REVIEWED },
      }).then(((count) => {
        // only send the plan ready event when this is the only reviewed phase in the project
        if (count !== 1) { return; }
        createEvent(BUS_API_EVENT.PROJECT_PLAN_READY, {
          projectId: project.id,
          phaseId: phase.id,
          projectName: project.name,
          userId: req.authUser.userId,
          initiatorUserId: req.authUser.userId,
        }, logger);
      }));
    }
  }

  /**
   * PROJECT_PHASE_ADDED
   */
  app.on(EVENT.ROUTING_KEY.PROJECT_PHASE_ADDED, ({ req, created }) => { // eslint-disable-line no-unused-vars
    logger.debug('receive PROJECT_PHASE_ADDED event');

    const projectId = _.parseInt(req.params.projectId);

    models.Project.findOne({
      where: { id: projectId },
    })
      .then((project) => {
        createEvent(BUS_API_EVENT.PROJECT_PLAN_MODIFIED, {
          projectId,
          projectName: project.name,
          userId: req.authUser.userId,
          initiatorUserId: req.authUser.userId,
        }, logger);

        return sendPlanReadyEventIfNeeded(req, project, created);
      }).catch(err => null);    // eslint-disable-line no-unused-vars
  });

  /**
  * PROJECT_PHASE_REMOVED
  */
  app.on(EVENT.ROUTING_KEY.PROJECT_PHASE_REMOVED, ({ req, deleted }) => { // eslint-disable-line no-unused-vars
    logger.debug('receive PROJECT_PHASE_REMOVED event');

    const projectId = _.parseInt(req.params.projectId);

    models.Project.findOne({
      where: { id: projectId },
    })
      .then((project) => {
        createEvent(BUS_API_EVENT.PROJECT_PLAN_MODIFIED, {
          projectId,
          projectName: project.name,
          userId: req.authUser.userId,
          initiatorUserId: req.authUser.userId,
        }, logger);
      }).catch(err => null);    // eslint-disable-line no-unused-vars
  });

  /**
  * PROJECT_PHASE_UPDATED
  */
  app.on(EVENT.ROUTING_KEY.PROJECT_PHASE_UPDATED, ({ req, original, updated }) => { // eslint-disable-line no-unused-vars
    logger.debug('receive PROJECT_PHASE_UPDATED event');

    const projectId = _.parseInt(req.params.projectId);
    const phaseId = _.parseInt(req.params.phaseId);

    models.Project.findOne({
      where: { id: projectId },
    })
      .then((project) => {
        createEvent(BUS_API_EVENT.PROJECT_PLAN_MODIFIED, {
          projectId,
          projectName: project.name,
          userId: req.authUser.userId,
          initiatorUserId: req.authUser.userId,
        }, logger);

        [
          ['spentBudget', BUS_API_EVENT.PROJECT_PHASE_UPDATE_PAYMENT],
          ['progress', [BUS_API_EVENT.PROJECT_PHASE_UPDATE_PROGRESS, BUS_API_EVENT.PROJECT_PROGRESS_MODIFIED]],
          ['details', BUS_API_EVENT.PROJECT_PHASE_UPDATE_SCOPE],
          ['status', BUS_API_EVENT.PROJECT_PHASE_TRANSITION_ACTIVE, PROJECT_PHASE_STATUS.ACTIVE],
          ['status', BUS_API_EVENT.PROJECT_PHASE_TRANSITION_COMPLETED, PROJECT_PHASE_STATUS.COMPLETED],
        ].forEach(([key, events, sendIfEqual]) => {
          // eslint-disable-next-line no-param-reassign
          events = Array.isArray(events) ? events : [events];

          // send event(s) only if the target field's value was updated, or when an update matches a "sendIfEqual" value
          if ((!sendIfEqual && !_.isEqual(original[key], updated[key])) ||
            (original[key] !== sendIfEqual && updated[key] === sendIfEqual)) {
            events.forEach(event => createEvent(event, {
              projectId,
              phaseId,
              projectName: project.name,
              userId: req.authUser.userId,
              initiatorUserId: req.authUser.userId,
            }, logger));
          }
        });

        return sendPlanReadyEventIfNeeded(req, project, updated);
      }).catch(err => null);    // eslint-disable-line no-unused-vars
  });

  /**
   * PROJECT_PHASE_PRODUCT_ADDED
   */
  app.on(EVENT.ROUTING_KEY.PROJECT_PHASE_PRODUCT_ADDED, ({ req, created }) => { // eslint-disable-line no-unused-vars
    logger.debug('receive PROJECT_PHASE_PRODUCT_ADDED event');

    const projectId = _.parseInt(req.params.projectId);

    models.Project.findOne({
      where: { id: projectId },
    })
      .then((project) => {
        createEvent(BUS_API_EVENT.PROJECT_PLAN_MODIFIED, {
          projectId,
          projectName: project.name,
          userId: req.authUser.userId,
          initiatorUserId: req.authUser.userId,
          phase: created,
        }, logger);
      }).catch(err => null);    // eslint-disable-line no-unused-vars
  });

  /**
  * PROJECT_PHASE_PRODUCT_REMOVED
  */
  app.on(EVENT.ROUTING_KEY.PROJECT_PHASE_PRODUCT_REMOVED, ({ req, deleted }) => { // eslint-disable-line no-unused-vars
    logger.debug('receive PROJECT_PHASE_PRODUCT_REMOVED event');

    const projectId = _.parseInt(req.params.projectId);

    models.Project.findOne({
      where: { id: projectId },
    })
      .then((project) => {
        createEvent(BUS_API_EVENT.PROJECT_PLAN_MODIFIED, {
          projectId,
          projectName: project.name,
          userId: req.authUser.userId,
          initiatorUserId: req.authUser.userId,
        }, logger);
      }).catch(err => null);    // eslint-disable-line no-unused-vars
  });

  /**
  * PROJECT_PHASE_PRODUCT_UPDATED
  */
  app.on(EVENT.ROUTING_KEY.PROJECT_PHASE_PRODUCT_UPDATED, ({ req, original, updated }) => { // eslint-disable-line no-unused-vars
    logger.debug('receive PROJECT_PHASE_PRODUCT_UPDATED event');

    const projectId = _.parseInt(req.params.projectId);

    models.Project.findOne({
      where: { id: projectId },
    })
      .then((project) => {
        // Spec changes
        if (!_.isEqual(original.details, updated.details)) {
          logger.debug(`Spec changed for product id ${updated.id}`);

          createEvent(BUS_API_EVENT.PROJECT_PRODUCT_SPECIFICATION_MODIFIED, {
            projectId,
            projectName: project.name,
            userId: req.authUser.userId,
            initiatorUserId: req.authUser.userId,
          }, logger);
        }

        // Other fields change
        const originalWithouDetails = _.omit(original, 'details');
        const updatedWithouDetails = _.omit(updated, 'details');
        if (!_.isEqual(originalWithouDetails.details, updatedWithouDetails.details)) {
          createEvent(BUS_API_EVENT.PROJECT_PLAN_MODIFIED, {
            projectId,
            projectName: project.name,
            userId: req.authUser.userId,
            initiatorUserId: req.authUser.userId,
          }, logger);
        }
      }).catch(err => null);    // eslint-disable-line no-unused-vars
  });
};
