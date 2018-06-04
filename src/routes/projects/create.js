

import validate from 'express-validation';
import _ from 'lodash';
import Joi from 'joi';
import config from 'config';

import models from '../../models';
import { PROJECT_MEMBER_ROLE, PROJECT_STATUS, USER_ROLE, EVENT, REGEX } from '../../constants';
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
      type: Joi.string().max(45).required(),
      details: Joi.any(),
      challengeEligibility: Joi.array().items(Joi.object().keys({
        role: Joi.string().valid('submitter', 'reviewer', 'copilot'),
        users: Joi.array().items(Joi.number().positive()),
        groups: Joi.array().items(Joi.number().positive()),
      })).allow(null),
      templateId: Joi.number().integer().positive(),
      version: Joi.string(),
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
    traverse(project).forEach(function (x) { // eslint-disable-line func-names
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
      let projectTemplate;
      const newPhases = [];
      // Validate the project type
      return models.ProjectType.findOne({ where: { key: project.type } })
        .then((projectType) => {
          if (!projectType) {
            // Not found
            const apiErr = new Error(`Project type not found for key ${project.type}`);
            apiErr.status = 422;
            return Promise.reject(apiErr);
          }

          return Promise.resolve();
        })
        // Validate the templateId
        .then(() => {
          if (project.templateId) {
            return models.ProjectTemplate.findById(project.templateId)
              .then((existingProjectTemplate) => {
                if (!existingProjectTemplate) {
                  // Not found
                  const apiErr = new Error(`Project template not found for id ${project.templateId}`);
                  apiErr.status = 422;
                  return Promise.reject(apiErr);
                }

                projectTemplate = existingProjectTemplate;
                return Promise.resolve();
              });
          }
          return Promise.resolve();
        })
        .then(() =>
          // Create project
          models.Project
            .create(project, {
              include: [{
                model: models.ProjectMember,
                as: 'members',
              }],
            }))
        .then((_newProject) => {
          newProject = _newProject;

          // Create phases and products
          // This needs to be done before creating direct project
          if (!projectTemplate) {
            return Promise.resolve();
          }

          const phases = _.values(projectTemplate.phases);
          return Promise.all(_.map(phases, phase =>
            // Create phase
            models.ProjectPhase.create(
              _.assign(
                _.omit(phase, 'products'),
                {
                  projectId: newProject.id,
                  updatedBy: req.authUser.userId,
                  createdBy: req.authUser.userId,
                },
              ),
            )
              .then((newPhase) => {
                // Make sure number of products of per phase <= max value
                const productCount = _.isArray(phase.products) ? phase.products.length : 0;
                if (productCount > config.maxPhaseProductCount) {
                  const err = new Error('the number of products per phase cannot exceed ' +
                    `${config.maxPhaseProductCount}`);
                  err.status = 422;
                  throw err;
                }

                // Create products
                return models.PhaseProduct.bulkCreate(_.map(phase.products, product =>
                  // productKey is just used for the JSON to be more human readable
                  // id need to map to templateId
                  _.assign(_.omit(product, ['id', 'productKey']), {
                    phaseId: newPhase.id,
                    projectId: newProject.id,
                    templateId: product.id,
                    updatedBy: req.authUser.userId,
                    createdBy: req.authUser.userId,
                  })), { returning: true })
                  .then((products) => {
                    // Add phases and products to the project JSON, so they can be stored to ES later
                    const newPhaseJson = _.omit(newPhase.toJSON(), ['deletedAt', 'deletedBy']);
                    newPhaseJson.products = _.map(products, product =>
                      _.omit(product.toJSON(), ['deletedAt', 'deletedBy']));
                    newPhases.push(newPhaseJson);
                    return Promise.resolve();
                  });
              })));
        })
        .then(() => {
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
            projectId: newProject.id,
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
          // set phases array
          newProject.phases = newPhases;

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
          req.log.error(err.message);
          util.handleError('Error creating project', err, req, next);
        });
    });
  },
];
