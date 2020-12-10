/* eslint-disable no-await-in-loop */

/**
 * API to upgrade projects
 */
import _ from 'lodash';
import moment from 'moment';
import validate from 'express-validation';
import Joi from 'joi';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import models from '../../models';
import util from '../../util';
import {
  PROJECT_STATUS,
  EVENT,
  RESOURCES,
} from '../../constants';

const permissions = tcMiddleware.permissions;

/**
 * Given a completed project id, find the latest completed status' creation date.
 *
 * @param {number} projectId the project id
 * @param {Transaction} [transaction] the transaction
 * @returns {Promise<date>} the latest completed status' creation date, or undefined if not found
 */
async function findCompletedProjectEndDate(projectId, transaction) {
  const projectHistoryRecord = await models.ProjectHistory.findOne({
    where: { projectId, status: PROJECT_STATUS.COMPLETED },
    order: [['createdAt', 'DESC']],
    attributes: ['createdAt'],
    raw: true,
    transaction,
  });
  return projectHistoryRecord && projectHistoryRecord.createdAt;
}

/**
 * Applies a given template to the destination object by taking data from the source object.
 * @param {object} template the template object
 * @param {object} source the source object
 * @param {object} destination the destination object
 * @returns {void}
 */
function applyTemplate(template, source, destination) {
  if (!template || typeof template !== 'object') { return; }
  if (!template.sections || !template.sections.length) { return; }
  // questions field is actually array of sections
  const templateQuestions = template.sections;
  // loop through for every section
  templateQuestions.forEach((section) => {
    // find subsections
    if (section.subSections && section.subSections.length) {
      // loop through every sub section
      section.subSections.forEach((subSection) => {
        // screens type sub sections need separate handling
        if (subSection.type === 'screens') {
          _.set(destination, subSection.fieldName, _.get(source, subSection.fieldName));
          return;
        }
        // other sub sections which requires generic handling
        if (subSection.fieldName) { // if sub section contains field name, directly copy its value
          // console.log(subSection.fieldName, _.get(source, subSection.fieldName));
          _.set(destination, subSection.fieldName, _.get(source, subSection.fieldName));
        } else if (subSection.type === 'questions') { // if questions typed subsection
          subSection.questions.forEach((question) => { // iterate throught each question to copy its value
            // console.log(question.fieldName, _.get(source, question.fieldName));
            _.set(destination, question.fieldName, _.get(source, question.fieldName));
          });
        }
      });
    }
  });
}

/**
 * Migrates a given project record from v2 to v3.
 *
 * @param {express.Request} req the request
 * @param {object} project the project record
 * @param {number} defaultProductTemplateId the default product template id
 * @param {string|undefined} phaseName the phase name (optional)
 * @returns {Promise<void>} promise
 */
async function migrateFromV2ToV3(req, project, defaultProductTemplateId, phaseName) {
  if (!project.details || !project.details.products || !project.details.products.length) {
    throw util.buildApiError(`could not locate product id for project ${project.id}`, 500);
  }
  /** @type {{ phase: {}, products: {}[] }[]} */
  const newPhasesAndProducts = [];
  const previousValue = _.clone(project.get({ plain: true }));
  await models.sequelize.transaction(async (transaction) => {
    const products = project.details.products;

    const projectTemplate = await models.ProjectTemplate.findOne({
      where: { key: products[0] },
      attributes: ['id', 'phases'],
      raw: true,
      transaction,
    });
    const phaseKeys = projectTemplate && projectTemplate.phases && Object.keys(projectTemplate.phases);
    // eslint-disable-next-line no-restricted-syntax
    for (const phaseKey of (phaseKeys || [])) {
      const phaseObject = projectTemplate.phases[phaseKey];
      const projectCompleted = project.status === PROJECT_STATUS.COMPLETED;
      const endDate = projectCompleted
        ? (await findCompletedProjectEndDate(project.id, transaction)) || project.updatedAt
        : null;
      // calculates the duration
      const projectDuration = endDate
        ? moment(endDate).diff(project.createdAt, 'days')
        : moment().diff(moment(project.createdAt), 'days');

      let phaseStatus = project.status;
      // maps the in_review status to the draft status for the phase
      phaseStatus = phaseStatus === PROJECT_STATUS.IN_REVIEW ? PROJECT_STATUS.DRAFT : phaseStatus;
      const projectPhase = await models.ProjectPhase.create({
        projectId: project.id,
        // TODO: there should be a clear requirement about how to set the phase's name without relying on its
        // products, as they are multiple, and this needs a single value
        // setting the name that was on the original phase's object, as is the most promising/obvious way of doing
        // this
        name: phaseName || phaseObject.name || '',
        status: phaseStatus,
        startDate: project.createdAt,
        duration: projectDuration,
        endDate,
        budget: project.details && project.details.appDefinition && project.details.appDefinition.budget,
        progress: projectCompleted ? 100 : 0,
        details: null,
        createdBy: req.authUser.userId,
        updatedBy: req.authUser.userId,
      }, { transaction });
      const phaseAndProducts = {
        phase: projectPhase,
        products: [],
      };
      newPhasesAndProducts.push(phaseAndProducts);
      // eslint-disable-next-line no-restricted-syntax
      for (const phaseProduct of (phaseObject.products || [])) {
        const useDefaultProductTemplateId = products.indexOf(phaseProduct.productKey) === -1;
        let query;
        if (useDefaultProductTemplateId) {
          // default strategy is to use the passed default product template id
          query = { id: defaultProductTemplateId };
        } else {
          query = { productKey: phaseProduct.productKey };
        }
        const productTemplate = await models.ProductTemplate.findOne({
          where: query,
          attributes: ['id', 'name', 'productKey', 'template'],
          raw: true,
          transaction,
        });
        if (!productTemplate) {
          throw util.buildApiError(`could not locate product template for project ${project.id}`, 500);
        }
        let detailsObject;
        if (productTemplate.template) {
          detailsObject = {};
          applyTemplate(productTemplate.template, project, detailsObject);
        }
        phaseAndProducts.products.push(
          await models.PhaseProduct.create({
            phaseId: projectPhase.id,
            projectId: project.id,
            templateId: productTemplate.id,
            directProjectId: project.directProjectId,
            billingAccountId: project.billingAccountId,
            name: productTemplate.name,
            type: productTemplate.productKey,
            estimatedPrice: project.estimatedPrice,
            actualPrice: project.actualPrice,
            details: detailsObject.details,
            createdBy: req.authUser.userId,
            updatedBy: req.authUser.userId,
          }, { transaction }));
      }
    }
    await project.update({ version: 'v3', templateId: projectTemplate.id }, { transaction });
  });
  newPhasesAndProducts.forEach(({ phase, products }) => {
    const phaseJSON = phase.toJSON();
    phaseJSON.products = products;
    req.log.debug('Sending event to Kafka bus for project phase %d', phase.id);
    req.app.emit(EVENT.ROUTING_KEY.PROJECT_PHASE_ADDED, { req, created: phaseJSON });
  });

  // Send events to buses (Project)
  req.log.debug('updated project', project);

  req.app.emit(EVENT.ROUTING_KEY.PROJECT_UPDATED, {
    req,
    original: previousValue,
    updated: _.assign({ resource: RESOURCES.PROJECT }, project.toJSON()),
  });
}

const allowedMigrations = {
  v3: {
    v2: migrateFromV2ToV3,
  },
};

const schema = {
  body: Joi.object().keys({
    targetVersion: Joi.string().valid(Object.keys(allowedMigrations)).required(),
    defaultProductTemplateId: Joi.number().integer().positive().required(),
    phaseName: Joi.string(),
  }).required(),
  options: {
    status: 400,
  },
};

module.exports = [
  validate(schema),
  permissions('project.admin'),
  async (req, res, next) => {
    try {
      const projectId = Number(req.params.projectId);
      const targetVersion = req.body.targetVersion;
      const targetVersionMigrationData = allowedMigrations[targetVersion];
      const project = await models.Project.findOne({ where: { id: projectId } });
      if (!project) {
        // returning 404
        throw util.buildApiError(`project not found for id ${projectId}`, 404);
      }
      const handler = targetVersionMigrationData[project.version];
      if (!handler) {
        // returning 400
        throw util.buildApiError(`current project version ${project.version} is not supported to be upgraded to ${
          targetVersion}`, 400);
      }
      // we have a valid project to be migrated
      await handler(req, project, req.body.defaultProductTemplateId, req.body.phaseName);
      res.status(200).json({ message: 'Project successfully migrated' });
    } catch (err) {
      next(err);
    }
  },
];
