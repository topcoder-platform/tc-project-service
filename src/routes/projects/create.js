

import validate from 'express-validation';
import _ from 'lodash';
import Joi from 'joi';

import models from '../../models';
import { PROJECT_TYPE, PROJECT_MEMBER_ROLE, PROJECT_STATUS, USER_ROLE, EVENT, REGEX } from '../../constants';
import util from '../../util';
import directProject from '../../services/directProject';

const traverse = require('traverse');

/**
 * API to handle creating a new project.
 * Also creates a direct project for legacy syste
 *
 * Permissions:
 * All Topcoder users are allowed to create a project.
 *
 */
const permissions = require('tc-core-library-js').middleware.permissions;

const createProjectValdiations = {
  body: {
    param: Joi.object().keys({
      name: Joi.string().required(),
      description: Joi.string().allow(null).allow('').optional(),
      billingAccountId: Joi.number().positive(),
      utm: Joi.object().keys({
        source: Joi.string().allow(null),
        medium: Joi.string().allow(null),
        campaign: Joi.string().allow(null),
      }).allow(null),
      bookmarks: Joi.array().items(Joi.object().keys({
        title: Joi.string(),
        address: Joi.string().regex(REGEX.URL),
      })).optional().allow(null),
      estimatedPrice: Joi.number().precision(2).positive().optional()
        .allow(null),
      terms: Joi.array().items(Joi.number().positive()).optional(),
      external: Joi.object().keys({
        id: Joi.string(),
        type: Joi.any().valid('github', 'jira', 'asana', 'other'),
        data: Joi.string().max(300), // TODO - restrict length
      }).allow(null),
      // TODO - add more types
      type: Joi.any().valid(_.values(PROJECT_TYPE)).required(),
      details: Joi.any(),
      challengeEligibility: Joi.array().items(Joi.object().keys({
        role: Joi.string().valid('submitter', 'reviewer', 'copilot'),
        users: Joi.array().items(Joi.number().positive()),
        groups: Joi.array().items(Joi.number().positive()),
      })).allow(null),
    }).required(),
  },
};

module.exports = [
  // handles request validations
  validate(createProjectValdiations),
  permissions('project.create'),
  /**
   * POST projects/
   * Create a project if the user has access
   */
  (req, res, next) => {
    const project = req.body.param;
    // by default connect admin and managers joins projects as manager
    const userRole = util.hasRoles(req, [USER_ROLE.CONNECT_ADMIN, USER_ROLE.MANAGER])
        ? PROJECT_MEMBER_ROLE.MANAGER
        : PROJECT_MEMBER_ROLE.CUSTOMER;
    // set defaults
    _.defaults(project, {
      description: '',
      createdBy: req.authUser.userId,
      updatedBy: req.authUser.userId,
      challengeEligibility: [],
      bookmarks: [],
      external: null,
      utm: null,
    });
    traverse(project).forEach(function (x) {
      if (this.isLeaf && typeof x === 'string') this.update(req.sanitize(x));
    });
    // override values
    _.assign(project, {
      status: PROJECT_STATUS.DRAFT,
      createdBy: req.authUser.userId,
      updatedBy: req.authUser.userId,
      members: [{
        isPrimary: true,
        role: userRole,
        userId: req.authUser.userId,
        updatedBy: req.authUser.userId,
        createdBy: req.authUser.userId,
      }],
    });
    models.sequelize.transaction(() => {
      let newProject = null;
      return models.Project
          .create(project, {
            include: [{
              model: models.ProjectMember,
              as: 'members',
            }],
          })
          .then((_newProject) => {
            newProject = _newProject;
            req.log.debug('new project created (id# %d, name: %s)',
                newProject.id, newProject.name);
            // create direct project with name and description
            const body = {
              projectName: newProject.name,
              projectDescription: newProject.description,
            };
            // billingAccountId is optional field
            if (newProject.billingAccountId) {
              body.billingAccountId = newProject.billingAccountId;
            }
            req.log.debug('creating project history for project %d', newProject.id);
            // add to project history
            models.ProjectHistory.create({
              projectId: _newProject.id,
              status: PROJECT_STATUS.DRAFT,
              cancelReason: null,
              updatedBy: req.authUser.userId,
            }).then(() => req.log.debug('project history created for project %d', newProject.id))
            .catch(() => req.log.error('project history failed for project %d', newProject.id));
            req.log.debug('creating direct project for project %d', newProject.id);
            return directProject.createDirectProject(req, body)
              .then((resp) => {
                newProject.directProjectId = resp.data.result.content.projectId;
                return newProject.save();
              })
              .then(() => newProject.reload(newProject.id))
              .catch((err) => {
                // log the error and continue
                req.log.error('Error creating direct project');
                req.log.error(err);
                return Promise.resolve();
              });
            // return Promise.resolve();
          })
          .then(() => {
            newProject = newProject.get({ plain: true });
            // remove utm details & deletedAt field
            newProject = _.omit(newProject, ['deletedAt', 'utm']);
            // add an empty attachments array
            newProject.attachments = [];
            req.log.debug('Sending event to RabbitMQ bus for project %d', newProject.id);
            req.app.services.pubsub.publish(EVENT.ROUTING_KEY.PROJECT_DRAFT_CREATED,
              newProject,
              { correlationId: req.id },
            );
            req.log.debug('Sending event to Kafka bus for project %d', newProject.id);
            // emit event
            req.app.emit(EVENT.ROUTING_KEY.PROJECT_DRAFT_CREATED, { req, project: newProject });
            res.status(201).json(util.wrapResponse(req.id, newProject, 1, 201));
          })
          .catch((err) => {
            util.handleError('Error creating project', err, req, next);
          });
    });
  },
];
