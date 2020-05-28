import _ from 'lodash';
import config from 'config';
import {
  EVENT,
  BUS_API_EVENT,
  CONNECT_NOTIFICATION_EVENT,
  PROJECT_STATUS,
  PROJECT_PHASE_STATUS,
  PROJECT_MEMBER_ROLE,
  ROUTES,
  MILESTONE_STATUS,
  INVITE_STATUS,
  ATTACHMENT_TYPES,
} from '../constants';
import { createEvent } from '../services/busApi';
import models from '../models';
import util from '../util';

/**
 * Map of project status and event name sent to bus api
 */
const mapEventTypes = {
  [PROJECT_STATUS.DRAFT]: CONNECT_NOTIFICATION_EVENT.PROJECT_CREATED,
  [PROJECT_STATUS.IN_REVIEW]: CONNECT_NOTIFICATION_EVENT.PROJECT_SUBMITTED_FOR_REVIEW,
  [PROJECT_STATUS.REVIEWED]: CONNECT_NOTIFICATION_EVENT.PROJECT_APPROVED,
  [PROJECT_STATUS.COMPLETED]: CONNECT_NOTIFICATION_EVENT.PROJECT_COMPLETED,
  [PROJECT_STATUS.CANCELLED]: CONNECT_NOTIFICATION_EVENT.PROJECT_CANCELED,
  [PROJECT_STATUS.PAUSED]: CONNECT_NOTIFICATION_EVENT.PROJECT_PAUSED,
  [PROJECT_STATUS.ACTIVE]: CONNECT_NOTIFICATION_EVENT.PROJECT_ACTIVE,
};

/**
 * Builds the connect project attachment url for the given project and attachment ids.
 *
 * @param {string|number} projectId the project id
 * @param {string|number} attachmentId the attachment id
 * @returns {string} the connect project attachment url
 */
function connectProjectAttachmentUrl(projectId, attachmentId) {
  return `${config.get('connectProjectsUrl')}${projectId}/attachments/${attachmentId}`;
}

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
  app.on(EVENT.ROUTING_KEY.PROJECT_DRAFT_CREATED, ({ req, project }) => {
    logger.debug('receive PROJECT_DRAFT_CREATED event');

    // send event to bus api
    createEvent(BUS_API_EVENT.PROJECT_CREATED, _.assign(project, {
      refCode: _.get(project, 'details.utm.code'),
      projectUrl: connectProjectUrl(project.id),
    }), logger);

    /*
      Send event for Notification Service
     */
    createEvent(CONNECT_NOTIFICATION_EVENT.PROJECT_CREATED, {
      projectId: project.id,
      projectName: project.name,
      refCode: _.get(project, 'details.utm.code'),
      projectUrl: connectProjectUrl(project.id),
      userId: req.authUser.userId,
      initiatorUserId: req.authUser.userId,
    }, logger);
  });

  /**
   * PROJECT_UPDATED
   */
  app.on(EVENT.ROUTING_KEY.PROJECT_UPDATED, ({ req, original, updated }) => {
    logger.debug('receive PROJECT_UPDATED event');

    createEvent(BUS_API_EVENT.PROJECT_UPDATED, _.assign(updated, {
      refCode: _.get(updated, 'details.utm.code'),
      projectUrl: connectProjectUrl(updated.id),
    }), logger);

    /*
      Send event for Notification Service
     */
    if (original.status !== updated.status) {
      logger.debug(`project status is updated from ${original.status} to ${updated.status}`);
      createEvent(mapEventTypes[updated.status], {
        projectId: updated.id,
        projectName: updated.name,
        refCode: _.get(updated, 'details.utm.code'),
        projectUrl: connectProjectUrl(updated.id),
        userId: req.authUser.userId,
        initiatorUserId: req.authUser.userId,
      }, logger);
    } else if (
      !_.isEqual(original.details, updated.details) ||
      !_.isEqual(original.name, updated.name) ||
      !_.isEqual(original.description, updated.description)) {
      logger.debug('project spec is updated');
      createEvent(CONNECT_NOTIFICATION_EVENT.PROJECT_SPECIFICATION_MODIFIED, {
        projectId: updated.id,
        projectName: updated.name,
        refCode: _.get(updated, 'details.utm.code'),
        projectUrl: connectProjectUrl(updated.id),
        userId: req.authUser.userId,
        initiatorUserId: req.authUser.userId,
      }, logger);
    } else if (!_.isEqual(original.bookmarks, updated.bookmarks)) {
      logger.debug('project bookmarks is updated');
      createEvent(CONNECT_NOTIFICATION_EVENT.PROJECT_LINK_CREATED, {
        projectId: updated.id,
        projectName: updated.name,
        refCode: _.get(updated, 'details.utm.code'),
        projectUrl: connectProjectUrl(updated.id),
        userId: req.authUser.userId,
        initiatorUserId: req.authUser.userId,
      }, logger);
    }

    // send PROJECT_UPDATED Kafka message when one of the specified below properties changed
    const watchProperties = ['status', 'details', 'name', 'description', 'bookmarks'];
    if (!_.isEqual(_.pick(original, watchProperties),
      _.pick(updated, watchProperties))) {
      createEvent(CONNECT_NOTIFICATION_EVENT.PROJECT_UPDATED, {
        projectId: updated.id,
        projectName: updated.name,
        refCode: _.get(updated, 'details.utm.code'),
        projectUrl: connectProjectUrl(updated.id),
        userId: req.authUser.userId,
        initiatorUserId: req.authUser.userId,
      }, logger);
    }
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
  app.on(EVENT.ROUTING_KEY.PROJECT_METADATA_CREATE, ({ req, resource }) => { // eslint-disable-line no-unused-vars
    logger.debug('receive PROJECT_METADATA_CREATE event');

    // send event to bus api
    createEvent(BUS_API_EVENT.PROJECT_METADATA_CREATE, resource, logger);
  });

  /**
   * PROJECT_METADATA_UPDATE
   */
  app.on(EVENT.ROUTING_KEY.PROJECT_METADATA_UPDATE, ({ req, resource }) => { // eslint-disable-line no-unused-vars
    logger.debug('receive PROJECT_METADATA_UPDATE event');

    createEvent(BUS_API_EVENT.PROJECT_METADATA_UPDATE, resource, logger);
  });

  /**
   * PROJECT_METADATA_DELETE
   */
  app.on(EVENT.ROUTING_KEY.PROJECT_METADATA_DELETE, ({ req, resource }) => { // eslint-disable-line no-unused-vars
    logger.debug('receive PROJECT_METADATA_DELETE event');

    createEvent(BUS_API_EVENT.PROJECT_METADATA_DELETE, resource, logger);
  });

  /**
   * PROJECT_MEMBER_ADDED
   */
  app.on(EVENT.ROUTING_KEY.PROJECT_MEMBER_ADDED, ({ req, resource }) => {
    logger.debug('receive PROJECT_MEMBER_ADDED event');

    createEvent(BUS_API_EVENT.PROJECT_MEMBER_ADDED, resource, logger);

    /*
      Send event for Notification Service
     */
    let eventType;
    const member = _.omit(resource, 'resource');

    if ([
      PROJECT_MEMBER_ROLE.MANAGER,
      PROJECT_MEMBER_ROLE.PROJECT_MANAGER,
      PROJECT_MEMBER_ROLE.PROGRAM_MANAGER,
      PROJECT_MEMBER_ROLE.SOLUTION_ARCHITECT,
    ].includes(member.role)) {
      eventType = CONNECT_NOTIFICATION_EVENT.MEMBER_JOINED_MANAGER;
    } else if (member.role === PROJECT_MEMBER_ROLE.COPILOT) {
      eventType = CONNECT_NOTIFICATION_EVENT.MEMBER_JOINED_COPILOT;
    } else {
      eventType = CONNECT_NOTIFICATION_EVENT.MEMBER_JOINED;
    }
    const projectId = _.parseInt(req.params.projectId);

    models.Project.findOne({
      where: { id: projectId },
    })
      .then((project) => {
        createEvent(eventType, {
          projectId,
          projectName: project.name,
          refCode: _.get(project, 'details.utm.code'),
          projectUrl: connectProjectUrl(projectId),
          userId: member.userId,
          initiatorUserId: req.authUser.userId,
        }, logger);

        createEvent(CONNECT_NOTIFICATION_EVENT.PROJECT_TEAM_UPDATED, {
          projectId: project.id,
          projectName: project.name,
          refCode: _.get(project, 'details.utm.code'),
          projectUrl: connectProjectUrl(project.id),
          userId: member.userId,
          initiatorUserId: req.authUser.userId,
        }, logger);
      }).catch(err => null); // eslint-disable-line no-unused-vars
  });

  /**
   * PROJECT_MEMBER_REMOVED
   */
  app.on(EVENT.ROUTING_KEY.PROJECT_MEMBER_REMOVED, ({ req, resource }) => {
    logger.debug('receive PROJECT_MEMBER_REMOVED event');

    createEvent(BUS_API_EVENT.PROJECT_MEMBER_REMOVED, resource, logger);

    /*
      Send event for Notification Service
     */
    let eventType;
    const member = _.omit(resource, 'resource');
    if (member.userId === req.authUser.userId) {
      eventType = CONNECT_NOTIFICATION_EVENT.MEMBER_LEFT;
    } else {
      eventType = CONNECT_NOTIFICATION_EVENT.MEMBER_REMOVED;
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
            refCode: _.get(project, 'details.utm.code'),
            projectUrl: connectProjectUrl(projectId),
            userId: member.userId,
            initiatorUserId: req.authUser.userId,
          }, logger);

          createEvent(CONNECT_NOTIFICATION_EVENT.PROJECT_TEAM_UPDATED, {
            projectId: project.id,
            projectName: project.name,
            refCode: _.get(project, 'details.utm.code'),
            projectUrl: connectProjectUrl(project.id),
            userId: member.userId,
            initiatorUserId: req.authUser.userId,
          }, logger);
        }
      }).catch(err => null); // eslint-disable-line no-unused-vars
  });

  /**
   * PROJECT_MEMBER_UPDATED
   */
  app.on(EVENT.ROUTING_KEY.PROJECT_MEMBER_UPDATED, ({ req, resource, originalResource }) => {
    logger.debug('receive PROJECT_MEMBER_UPDATED event');

    createEvent(BUS_API_EVENT.PROJECT_MEMBER_UPDATED, resource, logger);

    /*
      Send event for Notification Service
     */
    const projectId = _.parseInt(req.params.projectId);
    const updated = _.omit(resource, 'resource');
    const original = _.omit(originalResource, 'resource');

    models.Project.findOne({
      where: { id: projectId },
    })
      .then((project) => {
        if (project) {
          if (updated.isPrimary && !original.isPrimary) {
            createEvent(CONNECT_NOTIFICATION_EVENT.MEMBER_ASSIGNED_AS_OWNER, {
              projectId,
              projectName: project.name,
              refCode: _.get(project, 'details.utm.code'),
              projectUrl: connectProjectUrl(projectId),
              userId: updated.userId,
              initiatorUserId: req.authUser.userId,
            }, logger);
          }

          createEvent(CONNECT_NOTIFICATION_EVENT.PROJECT_TEAM_UPDATED, {
            projectId: project.id,
            projectName: project.name,
            refCode: _.get(project, 'details.utm.code'),
            projectUrl: connectProjectUrl(project.id),
            userId: updated.userId,
            initiatorUserId: req.authUser.userId,
          }, logger);
        }
      }).catch(err => null); // eslint-disable-line no-unused-vars
  });

  /**
   * PROJECT_ATTACHMENT_ADDED
   */
  app.on(EVENT.ROUTING_KEY.PROJECT_ATTACHMENT_ADDED, ({ req, resource }) => {
    logger.debug('receive PROJECT_ATTACHMENT_ADDED event');

    createEvent(BUS_API_EVENT.PROJECT_ATTACHMENT_ADDED, resource, logger);

    /*
      Send event for Notification Service
     */
    const projectId = _.parseInt(req.params.projectId);
    const attachment = _.omit(resource, 'resource');

    models.Project.findOne({
      where: { id: projectId },
    })
      .then((project) => {
        if (attachment.type === ATTACHMENT_TYPES.FILE) {
          createEvent(CONNECT_NOTIFICATION_EVENT.PROJECT_FILE_UPLOADED, {
            projectId,
            projectName: project.name,
            refCode: _.get(project, 'details.utm.code'),
            projectUrl: connectProjectUrl(projectId),
            fileName: attachment.path.replace(/^.*[\\\/]/, ''),    // eslint-disable-line
            fileUrl: connectProjectAttachmentUrl(projectId, attachment.id),
            allowedUsers: attachment.allowedUsers,
            userId: req.authUser.userId,
            initiatorUserId: req.authUser.userId,
          }, logger);
        }

        if (attachment.type === ATTACHMENT_TYPES.LINK) {
          createEvent(CONNECT_NOTIFICATION_EVENT.PROJECT_LINK_CREATED, {
            projectId,
            projectName: project.name,
            refCode: _.get(project, 'details.utm.code'),
            projectUrl: connectProjectUrl(projectId),
            userId: req.authUser.userId,
            initiatorUserId: req.authUser.userId,
          }, logger);
        }

        createEvent(CONNECT_NOTIFICATION_EVENT.PROJECT_ATTACHMENT_UPDATED, {
          projectId: project.id,
          projectName: project.name,
          refCode: _.get(project, 'details.utm.code'),
          projectUrl: connectProjectUrl(project.id),
          userId: req.authUser.userId,
          initiatorUserId: req.authUser.userId,
        }, logger);
      }).catch(err => null); // eslint-disable-line no-unused-vars
  });

  /**
   * PROJECT_ATTACHMENT_UPDATED
   */
  app.on(EVENT.ROUTING_KEY.PROJECT_ATTACHMENT_UPDATED, ({ req, resource }) => {
    logger.debug('receive PROJECT_ATTACHMENT_UPDATED event');

    createEvent(BUS_API_EVENT.PROJECT_ATTACHMENT_UPDATED, resource, logger);

    /*
      Send event for Notification Service
     */
    const projectId = _.parseInt(req.params.projectId);

    models.Project.findOne({
      where: { id: projectId },
    })
      .then((project) => {
        createEvent(CONNECT_NOTIFICATION_EVENT.PROJECT_ATTACHMENT_UPDATED, {
          projectId: project.id,
          projectName: project.name,
          refCode: _.get(project, 'details.utm.code'),
          projectUrl: connectProjectUrl(project.id),
          userId: req.authUser.userId,
          initiatorUserId: req.authUser.userId,
        }, logger);
      }).catch(err => null); // eslint-disable-line no-unused-vars
  });

  /**
   * PROJECT_ATTACHMENT_REMOVED
   */
  app.on(EVENT.ROUTING_KEY.PROJECT_ATTACHMENT_REMOVED, ({ req, resource }) => {
    logger.debug('receive PROJECT_ATTACHMENT_REMOVED event');

    createEvent(BUS_API_EVENT.PROJECT_ATTACHMENT_REMOVED, resource, logger);

    /*
      Send event for Notification Service
     */
    const projectId = _.parseInt(req.params.projectId);

    models.Project.findOne({
      where: { id: projectId },
    })
      .then((project) => {
        createEvent(CONNECT_NOTIFICATION_EVENT.PROJECT_ATTACHMENT_UPDATED, {
          projectId: project.id,
          projectName: project.name,
          refCode: _.get(project, 'details.utm.code'),
          projectUrl: connectProjectUrl(project.id),
          userId: req.authUser.userId,
          initiatorUserId: req.authUser.userId,
        }, logger);
      }).catch(err => null); // eslint-disable-line no-unused-vars
  });

  /**
   * If the project is in draft status and the phase is in reviewed status, and it's the
   * only phase in the project with that status, then send the plan ready event.
   *
   * @param {object} req the req
   * @param {object} project the project
   * @param {object} phase the phase that was created/updated
   * @returns {Promise<void>} void
   */
  async function sendPlanReadyEventIfNeeded(req, project, phase) {
    if (project.status === PROJECT_STATUS.DRAFT &&
      phase.status === PROJECT_PHASE_STATUS.REVIEWED) {
      await models.ProjectPhase.count({
        where: { projectId: project.id, status: PROJECT_PHASE_STATUS.REVIEWED },
      }).then(((count) => {
        // only send the plan ready event when this is the only reviewed phase in the project
        if (count === 1) {
          createEvent(CONNECT_NOTIFICATION_EVENT.PROJECT_PLAN_READY, {
            projectId: project.id,
            phaseId: phase.id,
            projectName: project.name,
            refCode: _.get(project, 'details.utm.code'),
            userId: req.authUser.userId,
            initiatorUserId: req.authUser.userId,
          }, logger);
        }
      }));
    }
  }

  /**
   * PROJECT_PHASE_ADDED
   */
  app.on(EVENT.ROUTING_KEY.PROJECT_PHASE_ADDED, ({ req, resource }) => {
    logger.debug('receive PROJECT_PHASE_ADDED event');

    createEvent(BUS_API_EVENT.PROJECT_PHASE_CREATED, resource, logger);

    /*
      Send event for Notification Service
     */
    const projectId = _.parseInt(req.params.projectId);
    const created = _.omit(resource, 'resource');

    models.Project.findOne({
      where: { id: projectId },
    })
      .then((project) => {
        createEvent(CONNECT_NOTIFICATION_EVENT.PROJECT_PLAN_UPDATED, {
          projectId,
          projectName: project.name,
          refCode: _.get(project, 'details.utm.code'),
          projectUrl: connectProjectUrl(projectId),
          userId: req.authUser.userId,
          initiatorUserId: req.authUser.userId,
          allowedUsers: created.status === PROJECT_PHASE_STATUS.DRAFT ?
            util.getTopcoderProjectMembers(project.members) : null,
        }, logger);
        return sendPlanReadyEventIfNeeded(req, project, created);
      }).catch(err => null); // eslint-disable-line no-unused-vars
  });

  /**
  * PROJECT_PHASE_REMOVED
  */
  app.on(EVENT.ROUTING_KEY.PROJECT_PHASE_REMOVED, ({ req, resource }) => {
    logger.debug('receive PROJECT_PHASE_REMOVED event');

    createEvent(BUS_API_EVENT.PROJECT_PHASE_DELETED, resource, logger);

    /*
      Send event for Notification Service
     */
    const projectId = _.parseInt(req.params.projectId);
    const deleted = _.omit(resource, 'resource');

    models.Project.findOne({
      where: { id: projectId },
    })
      .then((project) => {
        createEvent(CONNECT_NOTIFICATION_EVENT.PROJECT_PLAN_UPDATED, {
          projectId,
          projectName: project.name,
          refCode: _.get(project, 'details.utm.code'),
          projectUrl: connectProjectUrl(projectId),
          userId: req.authUser.userId,
          initiatorUserId: req.authUser.userId,
          allowedUsers: deleted.status === PROJECT_PHASE_STATUS.DRAFT ?
            util.getTopcoderProjectMembers(project.members) : null,
        }, logger);
      }).catch(err => null); // eslint-disable-line no-unused-vars
  });

  /**
  * PROJECT_PHASE_UPDATED
  */
  app.on(EVENT.ROUTING_KEY.PROJECT_PHASE_UPDATED, ({ req, resource, originalResource, route, skipNotification }) => { // eslint-disable-line no-unused-vars
    logger.debug('receive PROJECT_PHASE_UPDATED event');

    createEvent(BUS_API_EVENT.PROJECT_PHASE_UPDATED, resource, logger);

    /*
      Send event for Notification Service
     */
    if (!skipNotification) {
      const projectId = _.parseInt(req.params.projectId);
      const phaseId = _.parseInt(req.params.phaseId);
      const updated = _.omit(resource, 'resource');
      const original = _.omit(originalResource, 'resource');

      models.Project.findOne({
        where: { id: projectId },
      })
        .then((project) => {
          logger.debug(`Fetched project ${projectId} for the phase ${phaseId}`);
          const eventsMap = {};
          [
            ['duration', CONNECT_NOTIFICATION_EVENT.PROJECT_PLAN_UPDATED],
            ['startDate', CONNECT_NOTIFICATION_EVENT.PROJECT_PLAN_UPDATED],
            ['spentBudget', route === ROUTES.PHASES.UPDATE
              ? CONNECT_NOTIFICATION_EVENT.PROJECT_PHASE_UPDATE_PAYMENT
              : CONNECT_NOTIFICATION_EVENT.PROJECT_WORK_UPDATE_PAYMENT,
            ],
            ['progress', [route === ROUTES.PHASES.UPDATE
              ? CONNECT_NOTIFICATION_EVENT.PROJECT_PHASE_UPDATE_PROGRESS
              : CONNECT_NOTIFICATION_EVENT.PROJECT_WORK_UPDATE_PROGRESS,
            CONNECT_NOTIFICATION_EVENT.PROJECT_PROGRESS_MODIFIED,
            ]],
            ['details', route === ROUTES.PHASES.UPDATE
              ? CONNECT_NOTIFICATION_EVENT.PROJECT_PHASE_UPDATE_SCOPE
              : CONNECT_NOTIFICATION_EVENT.PROJECT_WORK_UPDATE_SCOPE,
            ],
            ['status', route === ROUTES.PHASES.UPDATE
              ? CONNECT_NOTIFICATION_EVENT.PROJECT_PHASE_TRANSITION_ACTIVE
              : CONNECT_NOTIFICATION_EVENT.PROJECT_WORK_TRANSITION_ACTIVE,
            PROJECT_PHASE_STATUS.ACTIVE,
            ],
            ['status', route === ROUTES.PHASES.UPDATE
              ? CONNECT_NOTIFICATION_EVENT.PROJECT_PHASE_TRANSITION_COMPLETED
              : CONNECT_NOTIFICATION_EVENT.PROJECT_WORK_TRANSITION_COMPLETED,
            PROJECT_PHASE_STATUS.COMPLETED,
            ],
            // ideally we should validate the old value being 'DRAFT' but there is no other status from which
            // we can move phase to REVIEWED status
            ['status', CONNECT_NOTIFICATION_EVENT.PROJECT_PLAN_UPDATED, PROJECT_PHASE_STATUS.REVIEWED],
            // ideally we should validate the old value being 'REVIEWED' but there is no other status from which
            // we can move phase to DRAFT status
            ['status', CONNECT_NOTIFICATION_EVENT.PROJECT_PLAN_UPDATED, PROJECT_PHASE_STATUS.DRAFT],
          ].forEach(([key, events, sendIfNewEqual]) => {
            // eslint-disable-next-line no-param-reassign
            events = Array.isArray(events) ? events : [events];
            // eslint-disable-next-line no-param-reassign
            events = _.filter(events, e => !eventsMap[e]);

            // send event(s) only if the target field's value was updated, or when an update matches a "sendIfNewEqual" value
            if ((!sendIfNewEqual && !_.isEqual(original[key], updated[key])) ||
              (original[key] !== sendIfNewEqual && updated[key] === sendIfNewEqual)) {
              events.forEach(event => createEvent(event, {
                projectId,
                phaseId,
                projectUrl: connectProjectUrl(projectId),
                originalPhase: original,
                updatedPhase: updated,
                projectName: project.name,
                userId: req.authUser.userId,
                initiatorUserId: req.authUser.userId,
                allowedUsers: updated.status === PROJECT_PHASE_STATUS.DRAFT ?
                  util.getTopcoderProjectMembers(project.members) : null,
              }, logger));
              events.forEach((event) => { eventsMap[event] = true; });
            }
          });

          return sendPlanReadyEventIfNeeded(req, project, updated);
        }).catch(err => null); // eslint-disable-line no-unused-vars
    }
  });

  /**
   * Send milestone notification if needed.
   * @param {Object} req the request
   * @param {Object} original the original milestone
   * @param {Object} updated the updated milestone
   * @param {Object} project the project
   * @param {Object} timeline the updated timeline
   * @returns {Promise<void>} void
   */
  function sendMilestoneNotification(req, original, updated, project, timeline) {
    logger.debug('sendMilestoneNotification', original, updated);
    // throw generic milestone updated bus api event
    createEvent(CONNECT_NOTIFICATION_EVENT.MILESTONE_UPDATED, {
      projectId: project.id,
      projectName: project.name,
      refCode: _.get(project, 'details.utm.code'),
      projectUrl: connectProjectUrl(project.id),
      timeline,
      originalMilestone: original,
      updatedMilestone: updated,
      userId: req.authUser.userId,
      initiatorUserId: req.authUser.userId,
    }, logger);
    // Send transition events
    if (original.status !== updated.status) {
      let event;
      if (updated.status === MILESTONE_STATUS.COMPLETED) {
        event = CONNECT_NOTIFICATION_EVENT.MILESTONE_TRANSITION_COMPLETED;
      } else if (updated.status === MILESTONE_STATUS.ACTIVE) {
        event = CONNECT_NOTIFICATION_EVENT.MILESTONE_TRANSITION_ACTIVE;
      } else if (updated.status === MILESTONE_STATUS.PAUSED) {
        event = CONNECT_NOTIFICATION_EVENT.MILESTONE_TRANSITION_PAUSED;
      }

      if (event) {
        createEvent(event, {
          projectId: project.id,
          projectName: project.name,
          refCode: _.get(project, 'details.utm.code'),
          projectUrl: connectProjectUrl(project.id),
          timeline,
          originalMilestone: original,
          updatedMilestone: updated,
          userId: req.authUser.userId,
          initiatorUserId: req.authUser.userId,
        }, logger);
      }
    }

    // Send notifications.connect.project.phase.milestone.waiting.customer event
    const originalWaiting = _.get(original, 'details.metadata.waitingForCustomer', false);
    const updatedWaiting = _.get(updated, 'details.metadata.waitingForCustomer', false);
    if (!originalWaiting && updatedWaiting) {
      createEvent(CONNECT_NOTIFICATION_EVENT.MILESTONE_WAITING_CUSTOMER, {
        projectId: project.id,
        projectName: project.name,
        refCode: _.get(project, 'details.utm.code'),
        projectUrl: connectProjectUrl(project.id),
        timeline,
        originalMilestone: original,
        updatedMilestone: updated,
        userId: req.authUser.userId,
        initiatorUserId: req.authUser.userId,
      }, logger);
    }
  }

  /**
   * MILESTONE_ADDED.
   */
  app.on(EVENT.ROUTING_KEY.MILESTONE_ADDED, ({ req, resource }) => { // eslint-disable-line no-unused-vars
    logger.debug('receive MILESTONE_ADDED event');

    createEvent(BUS_API_EVENT.MILESTONE_ADDED, resource, logger);

    /*
      Send event for Notification Service
     */
    const projectId = _.parseInt(req.params.projectId);
    const created = _.omit(resource, 'resource');

    models.Project.findOne({
      where: { id: projectId },
    })
      .then((project) => {
        if (project) {
          createEvent(CONNECT_NOTIFICATION_EVENT.MILESTONE_ADDED, {
            projectId,
            projectName: project.name,
            refCode: _.get(project, 'details.utm.code'),
            projectUrl: connectProjectUrl(projectId),
            addedMilestone: created,
            userId: req.authUser.userId,
            initiatorUserId: req.authUser.userId,
          }, logger);
        }
        // sendMilestoneNotification(req, {}, created, project);
      })
      .catch(err => null); // eslint-disable-line no-unused-vars
  });

  /**
  * MILESTONE_UPDATED.
  */
  app.on(EVENT.ROUTING_KEY.MILESTONE_UPDATED, ({
    req,
    resource,
    originalResource,
    skipNotification,
  }) => { // eslint-disable-line no-unused-vars
    logger.debug(`receive MILESTONE_UPDATED event for milestone ${resource.id}`);

    createEvent(BUS_API_EVENT.MILESTONE_UPDATED, resource, logger);

    /*
      Send event for Notification Service
     */
    if (!skipNotification) {
      const projectId = _.parseInt(req.params.projectId);
      const timeline = _.omit(req.timeline.toJSON(), 'deletedAt', 'deletedBy');
      const updated = _.omit(resource, 'resource');
      const original = _.omit(originalResource, 'resource');

      models.Project.findOne({
        where: { id: projectId },
      })
        .then((project) => {
          logger.debug(`Found project with id ${projectId}`);
          return models.Milestone.getTimelineDuration(timeline.id)
            .then(({ duration, progress }) => {
              timeline.duration = duration;
              timeline.progress = progress;
              sendMilestoneNotification(req, original, updated, project, timeline);

              // TODO raise this event again
              // if timeline is modified
              /* if (cascadedUpdates && cascadedUpdates.timeline) {
                const cTimeline = cascadedUpdates.timeline;
                // if endDate of the timeline is modified, raise TIMELINE_ADJUSTED event
                if (!moment(cTimeline.original.endDate).isSame(cTimeline.updated.endDate)) {
                  // Raise Timeline changed event
                  createEvent(CONNECT_NOTIFICATION_EVENT.TIMELINE_ADJUSTED, {
                    projectId: project.id,
                    projectName: project.name,
                    refCode: _.get(project, 'details.utm.code'),
                    projectUrl: connectProjectUrl(project.id),
                    originalTimeline: cTimeline.original,
                    updatedTimeline: cTimeline.updated,
                    userId: req.authUser.userId,
                    initiatorUserId: req.authUser.userId,
                  }, logger);
                }
              } */
            });
        }).catch(err => null); // eslint-disable-line no-unused-vars
    }
  });

  /**
  * MILESTONE_REMOVED.
  */
  app.on(EVENT.ROUTING_KEY.MILESTONE_REMOVED, ({ req, resource }) => { // eslint-disable-line no-unused-vars
    logger.debug('receive MILESTONE_REMOVED event');

    createEvent(BUS_API_EVENT.MILESTONE_REMOVED, resource, logger);

    /*
      Send event for Notification Service
     */
    const projectId = _.parseInt(req.params.projectId);
    const deleted = _.omit(resource, 'resource');

    models.Project.findOne({
      where: { id: projectId },
    })
      .then((project) => {
        if (project) {
          createEvent(CONNECT_NOTIFICATION_EVENT.MILESTONE_REMOVED, {
            projectId,
            projectName: project.name,
            refCode: _.get(project, 'details.utm.code'),
            projectUrl: connectProjectUrl(projectId),
            removedMilestone: deleted,
            userId: req.authUser.userId,
            initiatorUserId: req.authUser.userId,
          }, logger);
        }
      }).catch(err => null); // eslint-disable-line no-unused-vars
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
  app.on(EVENT.ROUTING_KEY.TIMELINE_UPDATED, ({ req, resource, originalResource }) => { // eslint-disable-line no-unused-vars
    logger.debug('receive TIMELINE_UPDATED event');

    createEvent(BUS_API_EVENT.TIMELINE_UPDATED, resource, logger);

    /*
      Send event for Notification Service
     */
    const updated = _.omit(resource, 'resource');
    const original = _.omit(originalResource, 'resource');
    // send PROJECT_UPDATED Kafka message when one of the specified below properties changed
    const watchProperties = ['startDate', 'endDate'];
    if (!_.isEqual(_.pick(original, watchProperties),
      _.pick(updated, watchProperties))) {
      // req.params.projectId is set by validateTimelineIdParam middleware
      const projectId = _.parseInt(req.params.projectId);

      models.Project.findOne({
        where: { id: projectId },
      })
        .then((project) => {
          if (project) {
            createEvent(CONNECT_NOTIFICATION_EVENT.TIMELINE_ADJUSTED, {
              projectId,
              projectName: project.name,
              refCode: _.get(project, 'details.utm.code'),
              projectUrl: connectProjectUrl(projectId),
              originalTimeline: original,
              updatedTimeline: updated,
              userId: req.authUser.userId,
              initiatorUserId: req.authUser.userId,
            }, logger);
          }
        }).catch(err => null); // eslint-disable-line no-unused-vars
    }
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
  app.on(EVENT.ROUTING_KEY.PROJECT_PHASE_PRODUCT_UPDATED, ({ req, resource, originalResource, route }) => { // eslint-disable-line no-unused-vars
    logger.debug('receive PROJECT_PHASE_PRODUCT_UPDATED event');

    createEvent(BUS_API_EVENT.PROJECT_PHASE_PRODUCT_UPDATED, resource, logger);

    /*
      Send event for Notification Service
     */
    const projectId = _.parseInt(req.params.projectId);
    const updated = _.omit(resource, 'resource');
    const original = _.omit(originalResource, 'resource');

    models.Project.findOne({
      where: { id: projectId },
    })
      .then((project) => {
        // Spec changes
        if (!_.isEqual(original.details, updated.details)) {
          logger.debug(`Spec changed for product id ${updated.id}`);

          const busApiEvent = route === ROUTES.PHASE_PRODUCTS.UPDATE
            ? CONNECT_NOTIFICATION_EVENT.PROJECT_PRODUCT_SPECIFICATION_MODIFIED
            : CONNECT_NOTIFICATION_EVENT.PROJECT_WORKITEM_SPECIFICATION_MODIFIED;

          createEvent(busApiEvent, {
            projectId,
            projectName: project.name,
            refCode: _.get(project, 'details.utm.code'),
            projectUrl: connectProjectUrl(projectId),
            userId: req.authUser.userId,
            initiatorUserId: req.authUser.userId,
          }, logger);
        }

        const watchProperties = ['name', 'estimatedPrice', 'actualPrice', 'details'];
        if (!_.isEqual(_.pick(original, watchProperties),
          _.pick(updated, watchProperties))) {
          createEvent(CONNECT_NOTIFICATION_EVENT.PROJECT_PLAN_UPDATED, {
            projectId,
            projectName: project.name,
            refCode: _.get(project, 'details.utm.code'),
            projectUrl: connectProjectUrl(projectId),
            userId: req.authUser.userId,
            initiatorUserId: req.authUser.userId,
            allowedUsers: updated.status === PROJECT_PHASE_STATUS.DRAFT ?
              util.getTopcoderProjectMembers(project.members) : null,
          }, logger);
        }
      }).catch(err => null); // eslint-disable-line no-unused-vars
  });

  /**
   * PROJECT_MEMBER_INVITE_CREATED
   */
  app.on(EVENT.ROUTING_KEY.PROJECT_MEMBER_INVITE_CREATED, ({ req, resource }) => { // eslint-disable-line no-unused-vars
    logger.debug('receive PROJECT_MEMBER_INVITE_CREATED event');

    createEvent(BUS_API_EVENT.PROJECT_MEMBER_INVITE_CREATED, resource, logger);

    /*
      Send event for Notification Service
     */
    const projectId = _.parseInt(req.params.projectId);
    const userId = resource.userId;
    const email = resource.email;
    const status = resource.status;
    const role = resource.role;

    models.Project.findOne({
      where: { id: projectId },
    })
      .then((project) => {
        logger.debug(util.isSSO);
        if (status === INVITE_STATUS.REQUESTED) {
          createEvent(CONNECT_NOTIFICATION_EVENT.PROJECT_MEMBER_INVITE_REQUESTED, {
            projectId,
            userId,
            email,
            role,
            initiatorUserId: req.authUser.userId,
            isSSO: util.isSSO(project),
          }, logger);
        } else {
        // send event to bus api
          logger.debug({
            projectId,
            userId,
            email,
            role,
            initiatorUserId: req.authUser.userId,
            isSSO: util.isSSO(project),
          });
          createEvent(CONNECT_NOTIFICATION_EVENT.PROJECT_MEMBER_INVITE_CREATED, {
            projectId,
            userId,
            email,
            role,
            initiatorUserId: req.authUser.userId,
            isSSO: util.isSSO(project),
          }, logger);
        }
      }).catch(err => logger.error(err)); // eslint-disable-line no-unused-vars
  });

  /**
   * PROJECT_MEMBER_INVITE_UPDATED
   */
  app.on(EVENT.ROUTING_KEY.PROJECT_MEMBER_INVITE_UPDATED, ({ req, resource }) => { // eslint-disable-line no-unused-vars
    logger.debug('receive PROJECT_MEMBER_INVITE_UPDATED event');

    createEvent(BUS_API_EVENT.PROJECT_MEMBER_INVITE_UPDATED, resource, logger);

    /*
      Send event for Notification Service
     */
    const projectId = _.parseInt(req.params.projectId);
    const userId = resource.userId;
    const email = resource.email;
    const status = resource.status;
    const role = resource.role;
    const createdBy = resource.createdBy;

    models.Project.findOne({
      where: { id: projectId },
    })
      .then((project) => {
        logger.debug(util.isSSO);
        if (status === INVITE_STATUS.REQUEST_APPROVED) {
        // send event to bus api
          createEvent(CONNECT_NOTIFICATION_EVENT.PROJECT_MEMBER_INVITE_APPROVED, {
            projectId,
            userId,
            originator: createdBy,
            email,
            role,
            status,
            initiatorUserId: req.authUser.userId,
            isSSO: util.isSSO(project),
          }, logger);
        } else if (status === INVITE_STATUS.REQUEST_REJECTED) {
        // send event to bus api
          createEvent(CONNECT_NOTIFICATION_EVENT.PROJECT_MEMBER_INVITE_REJECTED, {
            projectId,
            userId,
            originator: createdBy,
            email,
            role,
            status,
            initiatorUserId: req.authUser.userId,
            isSSO: util.isSSO(project),
          }, logger);
        } else {
        // send event to bus api
          createEvent(CONNECT_NOTIFICATION_EVENT.PROJECT_MEMBER_INVITE_UPDATED, {
            projectId,
            userId,
            email,
            role,
            status,
            initiatorUserId: req.authUser.userId,
            isSSO: util.isSSO(project),
          }, logger);
        }
      }).catch(err => null); // eslint-disable-line no-unused-vars
  });

  /**
   * PROJECT_MEMBER_INVITE_REMOVED
   */
  app.on(EVENT.ROUTING_KEY.PROJECT_MEMBER_INVITE_REMOVED, ({ req, resource }) => { // eslint-disable-line no-unused-vars
    logger.debug('receive PROJECT_MEMBER_INVITE_REMOVED event');

    createEvent(BUS_API_EVENT.PROJECT_MEMBER_INVITE_REMOVED, resource, logger);
  });
};
