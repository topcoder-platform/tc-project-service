

import validate from 'express-validation';
import _ from 'lodash';
import Joi from 'joi';
import config from 'config';
import moment from 'moment';

import models from '../../models';
import { PROJECT_MEMBER_ROLE, MANAGER_ROLES, PROJECT_STATUS, PROJECT_PHASE_STATUS,
  EVENT, RESOURCES, REGEX } from '../../constants';
import fieldLookupValidation from '../../middlewares/fieldLookupValidation';
import util from '../../util';

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
  body: Joi.object().keys({
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
    estimation: Joi.array().items(Joi.object().keys({
      conditions: Joi.string().required(),
      price: Joi.number().required(),
      quantity: Joi.number().optional(),
      minTime: Joi.number().integer().required(),
      maxTime: Joi.number().integer().required(),
      buildingBlockKey: Joi.string().required(),
      metadata: Joi.object().optional(),
    })).optional(),
  }).required(),
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
    if (project.estimation && (project.estimation.length > 0)) {
      req.log.debug('creating project estimation');
      const estimations = project.estimation.map(estimation => Object.assign({
        projectId: newProject.id,
        createdBy: req.authUser.userId,
        updatedBy: req.authUser.userId,
      }, estimation));
      return models.ProjectEstimation.bulkCreate(estimations, { returning: true }).then((projectEstimations) => {
        result.estimations = _.map(projectEstimations, estimation =>
          _.omit(estimation.toJSON(), ['deletedAt', 'deletedBy']));
        return Promise.resolve(newProject);
      });
    }
    return Promise.resolve(newProject);
  }).then((newProject) => {
    result.newProject = newProject;

    // backward compatibility for releasing the service before releasing the front end
    if (!projectTemplate) {
      return Promise.resolve(result);
    }
    const phases = _.filter(_.values(projectTemplate.phases), p => !!p);
    const productTemplateMap = {};
    productTemplates.forEach((pt) => {
      productTemplateMap[pt.id] = pt;
    });
    return Promise.all(_.map(phases, (phase, phaseIdx) => {
      const duration = _.get(phase, 'duration', 1);
      const startDate = moment.utc().hours(0).minutes(0).seconds(0)
        .milliseconds(0);
      // Create phase
      return models.ProjectPhase.create({
        projectId: newProject.id,
        name: _.get(phase, 'name', `Stage ${phaseIdx}`),
        duration,
        startDate: startDate.format(),
        endDate: moment.utc(startDate).add(duration - 1, 'days').format(),
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
      });
    }));
  }).then(() => Promise.resolve(result));
}

/**
 * Validates the project and product templates for the give project template id.
 *
 * @param {Integer} templateId id of the project template which should be validated
 * @returns {Promise} the promise that resolves to an object containing validated project and product templates
 */
function validateAndFetchTemplates(templateId) {
  // backward compatibility for releasing the service before releasing the front end
  // we ignore missing template id field and create a project without phase/products
  if (!templateId) return Promise.resolve({});
  return models.ProjectTemplate.findByPk(templateId, { raw: true })
  .then((existingProjectTemplate) => {
    if (!existingProjectTemplate) {
      // Not found
      const apiErr = new Error(`Project template not found for id ${templateId}`);
      apiErr.status = 400;
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
        apiErr.status = 400;
        throw apiErr;
      }
      _.map(phase.products, (product) => {
        productPromises.push(models.ProductTemplate.findByPk(product.id)
        .then((productTemplate) => {
          if (!productTemplate) {
            // Not found
            const apiErr = new Error(`Product template not found for id ${product.id}`);
            apiErr.status = 400;
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

module.exports = [
  // handles request validations
  validate(createProjectValdiations),
  permissions('project.create'),
  fieldLookupValidation(models.ProjectType, 'key', 'body.type', 'Project type'),
  /**
   * POST projects/
   * Create a project if the user has access
   */
  (req, res, next) => {
    const project = req.body;
    // by default connect admin and managers joins projects as manager
    const userRole = util.hasRoles(req, MANAGER_ROLES)
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
      // keep the raw '&&' string in conditions string in estimation
      const isEstimationCondition =
        (this.path.length === 3) && (this.path[0] === 'estimation') && (this.key === 'conditions');
      if (this.isLeaf && typeof x === 'string' && (!isEstimationCondition)) this.update(req.sanitize(x));
    });
    // override values
    _.assign(project, {
      status: PROJECT_STATUS.DRAFT,
      createdBy: req.authUser.userId,
      updatedBy: req.authUser.userId,
      lastActivityAt: new Date(),
      lastActivityUserId: req.authUser.userId.toString(10),
      members: [{
        isPrimary: true,
        role: userRole,
        userId: req.authUser.userId,
        updatedBy: req.authUser.userId,
        createdBy: req.authUser.userId,
      }],
    });
    // backward compatibility for releasing the service before releasing the front end
    if (!project.templateId) {
      project.version = 'v2';
    }
    let newProject = null;
    let newPhases;
    let projectEstimations;
    models.sequelize.transaction(() => {
      req.log.debug('Create Project - Starting transaction');
      // Validate the templates
      return validateAndFetchTemplates(project.templateId)
      // Create project and phases
      .then(({ projectTemplate, productTemplates }) => {
        req.log.debug('Creating project, phase and products');
        return createProjectAndPhases(req, project, projectTemplate, productTemplates);
      })
      .then((createdProjectAndPhases) => {
        newProject = createdProjectAndPhases.newProject;
        newPhases = createdProjectAndPhases.newPhases;
        projectEstimations = createdProjectAndPhases.estimations;

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
        return models.ProjectHistory.create({
          projectId: newProject.id,
          status: PROJECT_STATUS.DRAFT,
          cancelReason: null,
          updatedBy: req.authUser.userId,
        }).then(() => req.log.debug('project history created for project %d', newProject.id))
          .catch(() => req.log.error('project history failed for project %d', newProject.id));
      });
    })
    .then(() => {
      newProject = newProject.get({ plain: true });
      // remove utm details & deletedAt field
      newProject = _.omit(newProject, ['deletedAt', 'utm']);
      // add an empty attachments array
      newProject.attachments = [];
      // set phases array
      newProject.phases = newPhases;
      // sets estimations array
      if (projectEstimations) {
        newProject.estimations = projectEstimations;
      }

      req.log.debug('Sending event to RabbitMQ bus for project %d', newProject.id);
      req.app.services.pubsub.publish(EVENT.ROUTING_KEY.PROJECT_DRAFT_CREATED,
        newProject,
        { correlationId: req.id },
      );
      req.log.debug('Sending event to Kafka bus for project %d', newProject.id);
      // emit event
      req.app.emit(EVENT.ROUTING_KEY.PROJECT_DRAFT_CREATED,
        { req, project: _.assign({ resource: RESOURCES.PROJECT }, newProject),
        });
      res.status(201).json(newProject);
    })
    .catch((err) => {
      req.log.error(err.message);
      util.handleError('Error creating project', err, req, next);
    });
  },
];
