

import validate from 'express-validation';
import _ from 'lodash';
import Joi from 'joi';
import config from 'config';
import moment from 'moment';

import models from '../../models';
import { PROJECT_MEMBER_ROLE, PROJECT_STATUS, PROJECT_PHASE_STATUS,
  EVENT, RESOURCES, REGEX, WORKSTREAM_STATUS, ATTACHMENT_TYPES } from '../../constants';
import fieldLookupValidation from '../../middlewares/fieldLookupValidation';
import util from '../../util';
import { PERMISSION } from '../../permissions/constants';

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

const createProjectValidations = {
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
      createdAt: Joi.date(),
      createdBy: Joi.number().integer().positive(),
      updatedAt: Joi.date(),
      updatedBy: Joi.number().integer().positive(),
    })).optional().allow(null),
    estimatedPrice: Joi.number().precision(2).positive().optional()
      .allow(null),
    terms: Joi.array().items(Joi.string()).optional(),
    groups: Joi.array().items(Joi.string()).optional(),
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
    attachments: Joi.array().items(Joi.object().keys({
      category: Joi.string().required(),
      contentType: Joi.string().when('type', { is: ATTACHMENT_TYPES.FILE, then: Joi.string().required() }),
      description: Joi.string().allow(null).allow('').optional(),
      path: Joi.string().required(),
      type: Joi.string().required(),
      tags: Joi.array().items(Joi.string().min(1)).optional(),
      size: Joi.number().required(),
      title: Joi.string().required(),
    })).optional(),
  }).required(),
};

/**
 * Create ProjectEstimationItem with BuildingBlock.
 * @param {Array} estimations the project estimations
 * @param {Number} userId the request user id
 * @returns {Promise} the promise that resolves to the created ProjectEstimationItem
 */
function createEstimationItemsWithBuildingBlock(estimations, userId) {
  const buildingBlockKeys = _.map(estimations, estimation => estimation.buildingBlockKey);
  // get all building blocks
  return models.BuildingBlock.findAll({
    where: { deletedAt: { $eq: null }, key: buildingBlockKeys },
    raw: true,
    includePrivateConfigForInternalUsage: true,
  }).then((buildingBlocks) => {
    const blocks = {};
    _.forEach(buildingBlocks, (block) => {
      if (block) {
        blocks[block.key] = block;
      }
    });
    const estimationItems = [];
    _.forEach(estimations, (estimation) => {
      const block = blocks[estimation.buildingBlockKey];
      if (block && _.get(block, 'privateConfig.priceItems')) {
        _.forOwn(block.privateConfig.priceItems, (item, key) => {
          let itemPrice;
          if (_.isString(item) && item.endsWith('%')) {
            const percent = _.toNumber(item.replace('%', '')) / 100;
            itemPrice = _.toNumber(estimation.price) * percent;
          } else {
            itemPrice = item;
          }
          estimationItems.push({
            projectEstimationId: estimation.id,
            price: itemPrice,
            type: key,
            markupUsedReference: 'buildingBlock',
            markupUsedReferenceId: block.id,
            createdBy: userId,
            updatedBy: userId,
          });
        });
      }
    });

    return models.ProjectEstimationItem.bulkCreate(estimationItems, { returning: true });
  });
}

/**
 * Create workstreams for newly created project based on provided workstreams config
 * and project details
 *
 * @param {Object} req               express request object
 * @param {Object} newProject        new created project
 * @param {Object} workstreamsConfig config of workstreams to create
 *
 * @returns {Promise} the list of created WorkStreams
 */
function createWorkstreams(req, newProject, workstreamsConfig) {
  if (!workstreamsConfig) {
    req.log.debug('no workstream config found');
    return Promise.resolve([]);
  }

  req.log.debug('creating project workstreams');

  // get value of the field in the project data which would determine which workstream types to create
  const projectFieldValue = _.get(newProject, workstreamsConfig.projectFieldName);

  // the list of workstream types to create, based on the project field values
  // mapping provided in `workstreamTypesToProjectValues`
  const workstreamTypesToCreate = _.keys(_.pickBy(workstreamsConfig.workstreamTypesToProjectValues, fieldValues => (
    _.intersection(fieldValues, projectFieldValue).length > 0
  )));

  // the list workstreams to create
  const workstreamsToCreate = _.filter(workstreamsConfig.workstreams, workstream => (
    _.includes(workstreamTypesToCreate, workstream.type)
  )).map(workstreamToCreate => _.assign({}, workstreamToCreate, {
    projectId: newProject.id,
    status: WORKSTREAM_STATUS.DRAFT,
    createdBy: req.authUser.userId,
    updatedBy: req.authUser.userId,
  }));

  return models.WorkStream.bulkCreate(workstreamsToCreate);
  // return Promise.resolve(workstreamsToCreate);
}

/**
 * Create the project, project phases and products. This needs to be done before creating direct project.
 * @param {Object} req the request
 * @param {Object} project the project
 * @param {Object} projectTemplate the project template
 * @param {Array}  productTemplates array of the templates of the products used in the project template
 * @param {Array}  phasesList list phases definitions to create
 * @returns {Promise} the promise that resolves to the created project and phases
 */
function createProjectAndPhases(req, project, projectTemplate, productTemplates, phasesList) {
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
    req.log.debug('creating project estimation items with building blocks');
    if (result.estimations && result.estimations.length > 0) {
      return createEstimationItemsWithBuildingBlock(result.estimations, req.authUser.userId)
        .then((estimationItems) => {
          req.log.debug(`creating ${estimationItems.length} project estimation items`);
          // ignore project estimation items for now
          return Promise.resolve(newProject);
        });
    }
    return Promise.resolve(newProject);
  }).then((newProject) => {
    if (project.attachments && (project.attachments.length > 0)) {
      req.log.debug('creating project attachments');
      const attachments = project.attachments.map(attachment => Object.assign({
        projectId: newProject.id,
        createdBy: req.authUser.userId,
        updatedBy: req.authUser.userId,
      }, attachment));
      return models.ProjectAttachment.bulkCreate(attachments, { returning: true }).then((projectAttachments) => {
        result.attachments = _.map(projectAttachments, attachment =>
          _.omit(attachment.toJSON(), ['deletedAt', 'deletedBy']));
        return Promise.resolve(newProject);
      });
    }
    return Promise.resolve(newProject);
  })
    .then((newProject) => {
      result.newProject = newProject;

      // backward compatibility for releasing the service before releasing the front end
      if (!projectTemplate) {
        return Promise.resolve(result);
      }
      const productTemplateMap = {};
      productTemplates.forEach((pt) => {
        productTemplateMap[pt.id] = pt;
      });

      if (phasesList) {
        return Promise.all(_.map(phasesList, (phase, phaseIdx) => {
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
      }
      return Promise.resolve();
    })
    .then(() => Promise.resolve(result));
}

/**
 * Validates the project and product templates for the give project template id.
 *
 * @param {Integer} templateId id of the project template which should be validated
 * @returns {Promise} the promise that resolves to an object containing validated project, product templates and phases list
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
    // for old projectTemplate with `phases` just get phases config directly from projectTemplate
      if (projectTemplate.phases) {
      // for now support both ways: creating phases and creating workstreams
        const phasesList = _(projectTemplate.phases).omit('workstreamsConfig').values().value();
        const workstreamsConfig = _.get(projectTemplate.phases, 'workstreamsConfig');

        return { projectTemplate, phasesList, workstreamsConfig };
      }

      // for new projectTemplates try to get phases from the `planConfig`, if it's defined
      if (projectTemplate.planConfig) {
        return models.PlanConfig.findOneWithLatestRevision(projectTemplate.planConfig).then((planConfig) => {
          if (!planConfig) {
            const apiErr = new Error(`Cannot find planConfig ${JSON.stringify(projectTemplate.planConfig)}`);
            apiErr.status = 400;
            throw apiErr;
          }

          // for now support both ways: creating phases and creating workstreams
          const phasesList = _(planConfig.config).omit('workstreamsConfig').values().value();
          const workstreamsConfig = _.get(planConfig.config, 'workstreamsConfig');

          return { projectTemplate, phasesList, workstreamsConfig };
        });
      }

      return { projectTemplate };
    })
    .then(({ projectTemplate, phasesList, workstreamsConfig }) => {
      const productPromises = [];
      if (phasesList) {
        phasesList.forEach((phase) => {
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
      }
      if (productPromises.length > 0) {
        return Promise.all(productPromises).then(productTemplates => (
          { projectTemplate, productTemplates, phasesList, workstreamsConfig }
        ));
      }
      // if there is no phase or product in a phase is specified, return empty product templates
      return Promise.resolve({ projectTemplate, productTemplates: [], phasesList, workstreamsConfig });
    });
}

module.exports = [
  // handles request validations
  validate(createProjectValidations),
  permissions('project.create'),
  fieldLookupValidation(models.ProjectType, 'key', 'body.type', 'Project type'),
  /*
   * POST projects/
   * Create a project if the user has access
   */
  (req, res, next) => {
    const project = req.body;
    if (_.has(project, 'directProjectId') &&
      !util.hasPermissionByReq(PERMISSION.MANAGE_PROJECT_DIRECT_PROJECT_ID, req)) {
      const err = new Error('You do not have permission to set \'directProjectId\' property');
      err.status = 400;
      throw err;
    }
    // if (_.has(project, 'billingAccountId') &&
    //   !util.hasPermissionByReq(PERMISSION.MANAGE_PROJECT_BILLING_ACCOUNT_ID, req)) {
    //   const err = new Error('You do not have permission to set \'billingAccountId\' property');
    //   err.status = 400;
    //   throw err;
    // }
    // by default connect admin and managers joins projects as manager
    const userRole = util.hasPermissionByReq(PERMISSION.CREATE_PROJECT_AS_MANAGER, req)
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
      status: PROJECT_STATUS.IN_REVIEW,
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
    let projectAttachments;
    models.sequelize.transaction(() => {
      req.log.debug('Create Project - Starting transaction');
      // Validate the templates
      return validateAndFetchTemplates(project.templateId)
      // Create project and phases
        .then(({ projectTemplate, productTemplates, phasesList, workstreamsConfig }) => {
          req.log.debug('Creating project, phase and products');
          // only if workstream config is provided, treat such project as using workstreams
          // otherwise project would still use phases
          if (workstreamsConfig) {
            _.set(project, 'details.settings.workstreams', true);
          }
          return createProjectAndPhases(req, project, projectTemplate, productTemplates, phasesList)
            .then(createdProjectAndPhases =>
              createWorkstreams(req, createdProjectAndPhases.newProject, workstreamsConfig)
                .then(() => createdProjectAndPhases),
            );
        })
        .then((createdProjectAndPhases) => {
          newProject = createdProjectAndPhases.newProject;
          newPhases = createdProjectAndPhases.newPhases;
          projectEstimations = createdProjectAndPhases.estimations;
          projectAttachments = createdProjectAndPhases.attachments;

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
            status: PROJECT_STATUS.IN_REVIEW,
            cancelReason: null,
            updatedBy: req.authUser.userId,
          }).then(() => req.log.debug('project history created for project %d', newProject.id))
            .catch(() => req.log.error('project history failed for project %d', newProject.id));
          return Promise.resolve();
        });
    })
      .then(() => {
        newProject = newProject.get({ plain: true });
        // remove utm details & deletedAt field
        newProject = _.omit(newProject, ['deletedAt', 'utm']);
        // add the project attachments, if any
        newProject.attachments = projectAttachments;
        // set phases array
        newProject.phases = newPhases;
        // sets estimations array
        if (projectEstimations) {
          newProject.estimations = projectEstimations;
        }

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
