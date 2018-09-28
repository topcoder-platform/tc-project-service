import _ from 'lodash';
import config from 'config';
import { EVENT, BUS_API_EVENT, PROJECT_STATUS, PROJECT_PHASE_STATUS, PROJECT_MEMBER_ROLE, MILESTONE_STATUS }
  from '../constants';
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
    createEvent(BUS_API_EVENT.PROJECT_CREATED, {
      projectId: project.id,
      projectName: project.name,
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

    if (original.status !== updated.status) {
      logger.debug(`project status is updated from ${original.status} to ${updated.status}`);
      createEvent(mapEventTypes[updated.status], {
        projectId: updated.id,
        projectName: updated.name,
        projectUrl: connectProjectUrl(updated.id),
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
        projectUrl: connectProjectUrl(updated.id),
        userId: req.authUser.userId,
        initiatorUserId: req.authUser.userId,
      }, logger);
    } else if (!_.isEqual(original.bookmarks, updated.bookmarks)) {
      logger.debug('project bookmarks is updated');
      createEvent(BUS_API_EVENT.PROJECT_LINK_CREATED, {
        projectId: updated.id,
        projectName: updated.name,
        projectUrl: connectProjectUrl(updated.id),
        userId: req.authUser.userId,
        initiatorUserId: req.authUser.userId,
      }, logger);
    }

    // send PROJECT_UPDATED Kafka message when one of the specified below properties changed
    const watchProperties = ['status', 'details', 'name', 'description', 'bookmarks'];
    if (!_.isEqual(_.pick(original, watchProperties),
                   _.pick(updated, watchProperties))) {
      createEvent(BUS_API_EVENT.PROJECT_UPDATED, {
        projectId: updated.id,
        projectName: updated.name,
        projectUrl: connectProjectUrl(updated.id),
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
          projectUrl: connectProjectUrl(projectId),
          userId: member.userId,
          initiatorUserId: req.authUser.userId,
        }, logger);

        createEvent(BUS_API_EVENT.PROJECT_TEAM_UPDATED, {
          projectId: project.id,
          projectName: project.name,
          projectUrl: connectProjectUrl(project.id),
          userId: req.authUser.userId,
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
            projectUrl: connectProjectUrl(projectId),
            userId: member.userId,
            initiatorUserId: req.authUser.userId,
          }, logger);

          createEvent(BUS_API_EVENT.PROJECT_TEAM_UPDATED, {
            projectId: project.id,
            projectName: project.name,
            projectUrl: connectProjectUrl(project.id),
            userId: req.authUser.userId,
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

    models.Project.findOne({
      where: { id: projectId },
    })
      .then((project) => {
        if (project) {
          if (updated.isPrimary && !original.isPrimary) {
            createEvent(BUS_API_EVENT.MEMBER_ASSIGNED_AS_OWNER, {
              projectId,
              projectName: project.name,
              projectUrl: connectProjectUrl(projectId),
              userId: updated.userId,
              initiatorUserId: req.authUser.userId,
            }, logger);
          }

          createEvent(BUS_API_EVENT.PROJECT_TEAM_UPDATED, {
            projectId: project.id,
            projectName: project.name,
            projectUrl: connectProjectUrl(project.id),
            userId: req.authUser.userId,
            initiatorUserId: req.authUser.userId,
          }, logger);
        }
      }).catch(err => null);    // eslint-disable-line no-unused-vars
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
          projectUrl: connectProjectUrl(projectId),
          fileName: attachment.filePath.replace(/^.*[\\\/]/, ''),    // eslint-disable-line
          fileUrl: connectProjectAttachmentUrl(projectId, attachment.id),
          userId: req.authUser.userId,
          initiatorUserId: req.authUser.userId,
        }, logger);

        createEvent(BUS_API_EVENT.PROJECT_FILES_UPDATED, {
          projectId: project.id,
          projectName: project.name,
          projectUrl: connectProjectUrl(project.id),
          userId: req.authUser.userId,
          initiatorUserId: req.authUser.userId,
        }, logger);
      }).catch(err => null);    // eslint-disable-line no-unused-vars
  });


  /**
   * PROJECT_ATTACHMENT_UPDATED
   */
  app.on(EVENT.ROUTING_KEY.PROJECT_ATTACHMENT_UPDATED, ({ req }) => {
    logger.debug('receive PROJECT_ATTACHMENT_UPDATED event');

    const projectId = _.parseInt(req.params.projectId);

    models.Project.findOne({
      where: { id: projectId },
    })
    .then((project) => {
      createEvent(BUS_API_EVENT.PROJECT_FILES_UPDATED, {
        projectId: project.id,
        projectName: project.name,
        projectUrl: connectProjectUrl(project.id),
        userId: req.authUser.userId,
        initiatorUserId: req.authUser.userId,
      }, logger);
    }).catch(err => null);    // eslint-disable-line no-unused-vars
  });

  /**
   * PROJECT_ATTACHMENT_REMOVED
   */
  app.on(EVENT.ROUTING_KEY.PROJECT_ATTACHMENT_REMOVED, ({ req }) => {
    logger.debug('receive PROJECT_ATTACHMENT_REMOVED event');

    const projectId = _.parseInt(req.params.projectId);

    models.Project.findOne({
      where: { id: projectId },
    })
    .then((project) => {
      createEvent(BUS_API_EVENT.PROJECT_FILES_UPDATED, {
        projectId: project.id,
        projectName: project.name,
        projectUrl: connectProjectUrl(project.id),
        userId: req.authUser.userId,
        initiatorUserId: req.authUser.userId,
      }, logger);
    }).catch(err => null);    // eslint-disable-line no-unused-vars
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
          createEvent(BUS_API_EVENT.PROJECT_PLAN_READY, {
            projectId: project.id,
            phaseId: phase.id,
            projectName: project.name,
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
  app.on(EVENT.ROUTING_KEY.PROJECT_PHASE_ADDED, ({ req, created }) => { // eslint-disable-line no-unused-vars
    logger.debug('receive PROJECT_PHASE_ADDED event');

    const projectId = _.parseInt(req.params.projectId);

    models.Project.findOne({
      where: { id: projectId },
    })
      .then((project) => {
        createEvent(BUS_API_EVENT.PROJECT_PLAN_UPDATED, {
          projectId,
          projectName: project.name,
          projectUrl: connectProjectUrl(projectId),
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
        createEvent(BUS_API_EVENT.PROJECT_PLAN_UPDATED, {
          projectId,
          projectName: project.name,
          projectUrl: connectProjectUrl(projectId),
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
        logger.debug(`Fetched project ${projectId} for the phase ${phaseId}`);
        const eventsMap = {};
        [
          ['duration', BUS_API_EVENT.PROJECT_PLAN_UPDATED],
          ['startDate', BUS_API_EVENT.PROJECT_PLAN_UPDATED],
          ['spentBudget', BUS_API_EVENT.PROJECT_PHASE_UPDATE_PAYMENT],
          ['progress', [BUS_API_EVENT.PROJECT_PHASE_UPDATE_PROGRESS, BUS_API_EVENT.PROJECT_PROGRESS_MODIFIED]],
          ['details', BUS_API_EVENT.PROJECT_PHASE_UPDATE_SCOPE],
          ['status', BUS_API_EVENT.PROJECT_PHASE_TRANSITION_ACTIVE, PROJECT_PHASE_STATUS.ACTIVE],
          ['status', BUS_API_EVENT.PROJECT_PHASE_TRANSITION_COMPLETED, PROJECT_PHASE_STATUS.COMPLETED],
          // ideally we should validate the old value being 'DRAFT' but there is no other status from which
          // we can move phase to REVIEWED status
          ['status', BUS_API_EVENT.PROJECT_PLAN_UPDATED, PROJECT_PHASE_STATUS.REVIEWED],
          // ideally we should validate the old value being 'REVIEWED' but there is no other status from which
          // we can move phase to DRAFT status
          ['status', BUS_API_EVENT.PROJECT_PLAN_UPDATED, PROJECT_PHASE_STATUS.DRAFT],
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
            }, logger));
            events.forEach((event) => { eventsMap[event] = true; });
          }
        });

        return sendPlanReadyEventIfNeeded(req, project, updated);
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
            projectUrl: connectProjectUrl(projectId),
            userId: req.authUser.userId,
            initiatorUserId: req.authUser.userId,
          }, logger);
        }

        const watchProperties = ['name', 'estimatedPrice', 'actualPrice', 'details'];
        if (!_.isEqual(_.pick(original, watchProperties),
                       _.pick(updated, watchProperties))) {
          createEvent(BUS_API_EVENT.PROJECT_PLAN_UPDATED, {
            projectId,
            projectName: project.name,
            projectUrl: connectProjectUrl(projectId),
            userId: req.authUser.userId,
            initiatorUserId: req.authUser.userId,
          }, logger);
        }
      }).catch(err => null);    // eslint-disable-line no-unused-vars
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
    createEvent(BUS_API_EVENT.MILESTONE_UPDATED, {
      projectId: project.id,
      projectName: project.name,
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
        event = BUS_API_EVENT.MILESTONE_TRANSITION_COMPLETED;
      } else if (updated.status === MILESTONE_STATUS.ACTIVE) {
        event = BUS_API_EVENT.MILESTONE_TRANSITION_ACTIVE;
      }

      if (event) {
        createEvent(event, {
          projectId: project.id,
          projectName: project.name,
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
      createEvent(BUS_API_EVENT.MILESTONE_WAITING_CUSTOMER, {
        projectId: project.id,
        projectName: project.name,
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
  app.on(EVENT.ROUTING_KEY.MILESTONE_ADDED, ({ req, created }) => {
    logger.debug('receive MILESTONE_ADDED event');

    const projectId = _.parseInt(req.params.projectId);

    models.Project.findOne({
      where: { id: projectId },
    })
      .then((project) => {
        if (project) {
          createEvent(BUS_API_EVENT.MILESTONE_ADDED, {
            projectId,
            projectName: project.name,
            projectUrl: connectProjectUrl(projectId),
            addedMilestone: created,
            userId: req.authUser.userId,
            initiatorUserId: req.authUser.userId,
          }, logger);
        }
        // sendMilestoneNotification(req, {}, created, project);
      })
      .catch(err => null);    // eslint-disable-line no-unused-vars
  });

  /**
  * MILESTONE_UPDATED.
  */
  // eslint-disable-next-line no-unused-vars
  app.on(EVENT.ROUTING_KEY.MILESTONE_UPDATED, ({ req, original, updated, cascadedUpdates }) => {
    logger.debug(`receive MILESTONE_UPDATED event for milestone ${original.id}`);

    const projectId = _.parseInt(req.params.projectId);
    const timeline = _.omit(req.timeline.toJSON(), 'deletedAt', 'deletedBy');

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

        logger.debug('cascadedUpdates', cascadedUpdates);
        if (cascadedUpdates && cascadedUpdates.milestones && cascadedUpdates.milestones.length > 0) {
          _.each(cascadedUpdates.milestones, cascadedUpdate =>
            sendMilestoneNotification(req, cascadedUpdate.original, cascadedUpdate.updated, project, timeline),
          );
        }

        // if timeline is modified
        if (cascadedUpdates && cascadedUpdates.timeline) {
          const cTimeline = cascadedUpdates.timeline;
          // if endDate of the timeline is modified, raise TIMELINE_ADJUSTED event
          if (cTimeline.original.endDate !== cTimeline.updated.endDate) {
            // Raise Timeline changed event
            createEvent(BUS_API_EVENT.TIMELINE_ADJUSTED, {
              projectId: project.id,
              projectName: project.name,
              projectUrl: connectProjectUrl(project.id),
              originalTimeline: cTimeline.original,
              updatedTimeline: cTimeline.updated,
              userId: req.authUser.userId,
              initiatorUserId: req.authUser.userId,
            }, logger);
          }
        }
      });
    }).catch(err => null);    // eslint-disable-line no-unused-vars
  });

 /**
  * MILESTONE_REMOVED.
  */
  app.on(EVENT.ROUTING_KEY.MILESTONE_REMOVED, ({ req, deleted }) => {
    logger.debug('receive MILESTONE_REMOVED event');
    // req.params.projectId is set by validateTimelineIdParam middleware
    const projectId = _.parseInt(req.params.projectId);

    models.Project.findOne({
      where: { id: projectId },
    })
    .then((project) => {
      if (project) {
        createEvent(BUS_API_EVENT.MILESTONE_REMOVED, {
          projectId,
          projectName: project.name,
          projectUrl: connectProjectUrl(projectId),
          removedMilestone: deleted,
          userId: req.authUser.userId,
          initiatorUserId: req.authUser.userId,
        }, logger);
      }
    }).catch(err => null);    // eslint-disable-line no-unused-vars
  });

  app.on(EVENT.ROUTING_KEY.TIMELINE_UPDATED, ({ req, original, updated }) => {
    logger.debug('receive TIMELINE_UPDATED event');
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
          createEvent(BUS_API_EVENT.TIMELINE_ADJUSTED, {
            projectId,
            projectName: project.name,
            projectUrl: connectProjectUrl(projectId),
            originalTimeline: original,
            updatedTimeline: updated,
            userId: req.authUser.userId,
            initiatorUserId: req.authUser.userId,
          }, logger);
        }
      }).catch(err => null);    // eslint-disable-line no-unused-vars
    }
  });
};
