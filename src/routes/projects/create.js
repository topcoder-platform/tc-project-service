

import validate from 'express-validation';
import _ from 'lodash';
import Joi from 'joi';
import config from 'config';

import models from '../../models';
import { PROJECT_MEMBER_ROLE, PROJECT_STATUS, PROJECT_PHASE_STATUS, USER_ROLE, EVENT, REGEX } from '../../constants';
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

/**
 * Create the project, project phases and products. This needs to be done before creating direct project.
 * @param {Object} req the request
 * @param {Object} project the project
 * @param {Object} projectTemplate the project template
 * @param {Array} productTemplates array of the templates of the products used in the projec template
 * @returns {Promise} the promise that resolves to the created project and phases
 */
function createProjectAndPhases(req, project, projectTemplate, productTemplates) {
  const result = {
    newProject: null,
    newPhases: [],
  };

  // Create project
  return models.Project.create(project, {
    include: [{
      model: models.ProjectMember,
      as: 'members',
    }],
  }).then((newProject) => {
    result.newProject = newProject;

    if (!projectTemplate) {
      return Promise.resolve(result);
    }
    const phases = _.values(projectTemplate.phases);
    const productTemplateMap = _.map(productTemplates, (pt) => {
      const map = {};
      map[pt.id] = pt;
      return map;
    });
    return Promise.all(_.map(phases, (phase, phaseIdx) =>
      // Create phase
      models.ProjectPhase.create({
        projectId: newProject.id,
        name: _.get(phase, 'name', `Stage ${phaseIdx}`),
        status: _.get(phase, 'status', PROJECT_PHASE_STATUS.DRAFT),
        budget: _.get(phase, 'budget', 0),
        updatedBy: req.authUser.userId,
        createdBy: req.authUser.userId,
      }).then((newPhase) => {
        req.log.debug(`Creating products in the newly created phase ${newPhase.id}`);
        // Create products
        return models.PhaseProduct.bulkCreate(_.map(phase.products, (product, productIndex) => ({
          phaseId: newPhase.id,
          projectId: newProject.id,
          estimatedPrice: _.get(product, 'estimatedPrice', 0),
          name: _.get(product, 'name', _.get(productTemplateMap, `${product.id}.name`, `Product ${productIndex}`)),
          // assumes that phase template always contains id of each product
          templateId: parseInt(product.id, 10),
          updatedBy: req.authUser.userId,
          createdBy: req.authUser.userId,
        })), { returning: true })
        .then((products) => {
          // Add phases and products to the project JSON, so they can be stored to ES later
          const newPhaseJson = _.omit(newPhase.toJSON(), ['deletedAt', 'deletedBy']);
          newPhaseJson.products = _.map(products, product =>
            _.omit(product.toJSON(), ['deletedAt', 'deletedBy']));
          result.newPhases.push(newPhaseJson);
          return Promise.resolve();
        });
      }),
    ));
  }).then(() => Promise.resolve(result));
}

/**
 * Validates the project and product templates for the give project template id.
 *
 * @param {Integer} templateId id of the project template which should be validated
 * @returns {Promise} the promise that resolves to an object containing validated project and product templates
 */
function validateAndFetchTemplates(templateId) {
  return models.ProjectTemplate.findById(templateId, { raw: true })
  .then((existingProjectTemplate) => {
    if (!existingProjectTemplate) {
      // Not found
      const apiErr = new Error(`Project template not found for id ${templateId}`);
      apiErr.status = 422;
      return Promise.reject(apiErr);
    }
    return Promise.resolve(existingProjectTemplate);
  })
  .then((projectTemplate) => {
    const phases = _.values(projectTemplate.phases);
    const productPromises = [];
    phases.forEach((phase) => {
      // Make sure number of products of per phase <= max value
      const productCount = _.isArray(phase.products) ? phase.products.length : 0;
      if (productCount > config.maxPhaseProductCount) {
        const apiErr = new Error(`Number of products per phase cannot exceed ${config.maxPhaseProductCount}`);
        apiErr.status = 422;
        throw apiErr;
      }
      _.map(phase.products, (product) => {
        productPromises.push(models.ProductTemplate.findById(product.id)
        .then((productTemplate) => {
          if (!productTemplate) {
            // Not found
            const apiErr = new Error(`Product template not found for id ${product.id}`);
            apiErr.status = 422;
            return Promise.reject(apiErr);
          }
          return Promise.resolve(productTemplate);
        }));
      });
    });
    if (productPromises.length > 0) {
      return Promise.all(productPromises).then(productTemplates => ({ projectTemplate, productTemplates }));
    }
    // if there is no phase or product in a phase is specified, return empty product templates
    return Promise.resolve({ projectTemplate, productTemplates: [] });
  });
}

/**
 * Validates the project type being one from the allowed ones.
 *
 * @param {String} type key of the project type to be used
 * @returns {Promise} promise which resolves to a project type if it is valid, rejects otherwise with 422 error
 */
function validateProjectType(type) {
  return models.ProjectType.findOne({ where: { key: type } })
  .then((projectType) => {
    if (!projectType) {
      // Not found
      const apiErr = new Error(`Project type not found for key ${type}`);
      apiErr.status = 422;
      return Promise.reject(apiErr);
    }

    return Promise.resolve(projectType);
  });
}

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
      let newPhases;
      // Validate the project type
      return validateProjectType(project.type)
      // Validate the templates
      .then((projectType) => {
        req.log.debug(`Project type ${projectType.key} validated successfully`);
        return validateAndFetchTemplates(project.templateId);
      })
      // Create project and phases
      .then(({ projectTemplate, productTemplates }) => {
        req.log.debug('Creating project, phase and products');
        return createProjectAndPhases(req, project, projectTemplate, productTemplates);
      })
      .then((createdProjectAndPhases) => {
        newProject = createdProjectAndPhases.newProject;
        newPhases = createdProjectAndPhases.newPhases;

        req.log.debug('new project created (id# %d, name: %s)', newProject.id, newProject.name);
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
        // add to project history asynchronously, don't wait for it to complete
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
