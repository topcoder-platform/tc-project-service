import validate from 'express-validation';
import _ from 'lodash';
import Joi from 'joi';
import {
  middleware as tcMiddleware,
} from 'tc-core-library-js';
import models from '../../models';
import {
  PROJECT_STATUS,
  EVENT,
  RESOURCES,
  REGEX,
} from '../../constants';
import util from '../../util';
import { PERMISSION } from '../../permissions/constants';

const traverse = require('traverse');

/**
 * API to handle updating a project.
 */
const permissions = tcMiddleware.permissions;

/**
 * Customizer used to merge project properties -
 * Used with lodash mergeWith, recursively merges all values except array type
 * values which are replaced.
 * @param {Object} objValue val
 * @param {Object} srcValue val
 * @returns {Object} obj
 */
const mergeCustomizer = (objValue, srcValue) => {
  if (_.isArray(objValue)) {
    return srcValue;
  }
  return undefined;
};

const updateProjectValdiations = {
  body: Joi.object().keys({
    id: Joi.number().valid(Joi.ref('$params.id')),
    name: Joi.string(),
    description: Joi.string().allow(null).allow('').optional(),
    billingAccountId: Joi.number().positive(),
    directProjectId: Joi.number().positive().allow(null),
    status: Joi.any().valid(_.values(PROJECT_STATUS)),
    estimatedPrice: Joi.number().precision(2).positive().allow(null),
    actualPrice: Joi.number().precision(2).positive(),
    terms: Joi.array().items(Joi.string()),
    groups: Joi.array().items(Joi.string()),
    external: Joi.object().keys({
      id: Joi.string(),
      type: Joi.any().valid('github', 'jira', 'asana', 'other'),
      data: Joi.string().max(300), // TODO - restrict length
    }).allow(null),
    bookmarks: Joi.array().items(Joi.object().keys({
      title: Joi.string(),
      address: Joi.string().regex(REGEX.URL),
      createdAt: Joi.date(),
      createdBy: Joi.number().integer().positive(),
      updatedAt: Joi.date(),
      updatedBy: Joi.number().integer().positive(),
    })).optional().allow(null),
    type: Joi.string().max(45),
    details: Joi.any(),
    memers: Joi.any(),
    templateId: Joi.any().strip(), // ignore the template id
    createdBy: Joi.any(),
    createdAt: Joi.any(),
    updatedBy: Joi.any(),
    updatedAt: Joi.any(),
    challengeEligibility: Joi.array().items(Joi.object().keys({
      role: Joi.string().valid('submitter', 'reviewer', 'copilot'),
      users: Joi.array().items(Joi.number().positive()),
      groups: Joi.array().items(Joi.number().positive()),
    })).allow(null),
    // cancel reason is mandatory when project status is cancelled
    cancelReason: Joi.when('status', {
      is: PROJECT_STATUS.CANCELLED,
      then: Joi.string().required(),
      otherwise: Joi.string().optional(),
    }),
  }),
};

/**
 * Gets scopechange fields either from
 * "template.scope" (for old templates) or from "form.scope" (for new templates).
 *
 * @param {Object} project The project object
 *
 * @returns {Array} - the scopeChangeFields
 */
const getScopeChangeFields = (project) => {
  const scopeChangeFields = _.get(project, 'template.scope.scopeChangeFields');
  const getFromForm = _project => _.get(_project, 'template.form.config.scopeChangeFields');

  return scopeChangeFields || getFromForm(project);
};

const isScopeUpdated = (existingProject, updatedProps) => {
  const scopeFields = getScopeChangeFields(existingProject);

  if (scopeFields) {
    for (let idx = 0; idx < scopeFields.length; idx += 1) {
      const field = scopeFields[idx];
      const oldFieldValue = _.get(existingProject, field);
      const updateFieldValue = _.get(updatedProps, field);
      if (oldFieldValue !== updateFieldValue) {
        return true;
      }
    }
  }
  return false;
};

// NOTE- decided to disable all additional checks for now.
const validateUpdates = (existingProject, updatedProps, req) => {
  const errors = [];
  switch (existingProject.status) {
    case PROJECT_STATUS.COMPLETED:
      errors.push(`cannot update a project that is in '${existingProject.status}' state`);
      break;
    case PROJECT_STATUS.REVIEWED:
    case PROJECT_STATUS.ACTIVE:
    case PROJECT_STATUS.PAUSED: {
      if (isScopeUpdated(existingProject, updatedProps)) {
        // TODO commented to disable the scope change flow for immediate release
        // errors.push(`Scope changes are not allowed for '${existingProject.status}' project`);
      }
      break;
    }
    default:
      break;
    // disabling this check for now.
    // case PROJECT_STATUS.DRAFT:
    //   if (_.get(updatedProject, 'status', '') === 'active') {
    //     // attempting to launch the project make sure certain
    //     // properties are set
    //     if (!updatedProject.billingAccountId && !existingProject.billingAccountId) {
    //       errors.push('\'billingAccountId\' must be set before activating the project')
    //     }
    //   }
  }
  if (_.has(updatedProps, 'directProjectId') &&
    !util.hasPermissionByReq(PERMISSION.MANAGE_PROJECT_DIRECT_PROJECT_ID, req)) {
    errors.push('You do not have permission to update \'directProjectId\' property');
  }
  // if (_.has(updatedProps, 'billingAccountId') &&
  //   !util.hasPermissionByReq(PERMISSION.MANAGE_PROJECT_BILLING_ACCOUNT_ID, req)) {
  //   errors.push('You do not have permission to update \'billingAccountId\' property');
  // }
  if ((existingProject.status !== PROJECT_STATUS.DRAFT) && (updatedProps.status === PROJECT_STATUS.DRAFT)) {
    errors.push('cannot update a project status to draft');
  }
  return errors;
};

module.exports = [
  // handles request validations
  validate(updateProjectValdiations),
  permissions('project.edit'),
  /*
   * Validate project type to be existed.
   */
  (req, res, next) => {
    if (req.body.type) {
      models.ProjectType.findOne({ where: { key: req.body.type } })
        .then((projectType) => {
          if (projectType) {
            next();
          } else {
            const err = new Error(`Project type not found for key ${req.body.type}`);
            err.status = 400;
            next(err);
          }
        });
    } else {
      next();
    }
  },
  /*
   * POST projects/
   * Create a project if the user has access
   */
  (req, res, next) => {
    let project;
    let updatedProps = req.body;
    const projectId = _.parseInt(req.params.projectId);
    // prune any fields that cannot be updated directly
    updatedProps = _.omit(updatedProps, ['createdBy', 'createdAt', 'updatedBy', 'updatedAt', 'id']);
    traverse(updatedProps).forEach(function (x) { // eslint-disable-line func-names
      if (x && this.isLeaf && typeof x === 'string') this.update(req.sanitize(x));
    });
    let previousValue;
    models.sequelize.transaction(() => models.Project.findOne({
      where: {
        id: projectId,
      },
      lock: { of: models.Project },
    })
      .then((_prj) => {
        if (!_prj) {
          // handle 404
          const err = new Error(`project not found for id ${projectId}`);
          err.status = 404;
          return Promise.reject(err);
        }
        if (!_prj.templateId) return Promise.resolve({ _prj });
        return models.ProjectTemplate.getTemplate(_prj.templateId)
          .then(template => Promise.resolve({ _prj, template }));
      })
      .then(({ _prj, template }) => {
        project = _prj;
        previousValue = _.clone(project.get({ plain: true }));
        previousValue.template = template;
        // run additional validations
        const validationErrors = validateUpdates(previousValue, updatedProps, req);
        if (validationErrors.length > 0) {
          const err = new Error('Unable to update project');
          _.assign(err, {
            details: JSON.stringify(validationErrors),
            status: 400,
          });
          return Promise.reject(err);
        }

        // check if user has permissions to update project status
        if (
          updatedProps.status &&
          updatedProps.status !== project.status &&
          !util.hasPermissionByReq(PERMISSION.UPDATE_PROJECT_STATUS, req)
        ) {
          const err = new Error('You are not allowed to update project status.');
          err.status = 403;
          return Promise.reject(err);
        }

        // no updates if same

        if (_.isEqual(previousValue, updatedProps)) {
          return Promise.resolve();
        }
        updatedProps.updatedBy = req.authUser.userId;
        const newValues = _.mergeWith({}, previousValue, updatedProps, mergeCustomizer);
        project.set(newValues);
        return project.save();
      })
      .then(() => project.reload(project.id))
      // update project history
      .then(() => new Promise((accept, reject) => {
        // we only want to have project history when project status is updated
        if (updatedProps.status && (updatedProps.status !== previousValue.status)) {
          models.ProjectHistory.create({
            projectId: project.id,
            status: updatedProps.status,
            cancelReason: updatedProps.cancelReason,
            updatedBy: req.authUser.userId,
          }).then(() => accept()).catch(err => reject(err));
        } else {
          accept();
        }
      })))
      .then(() => { // transaction has been committed
        project = project.get({ plain: true });
        project = _.omit(project, ['deletedAt']);
        req.log.debug('updated project', project);
        previousValue = _.omit(previousValue, ['deletedAt']);
        req.app.emit(EVENT.ROUTING_KEY.PROJECT_UPDATED, {
          req,
          original: previousValue,
          updated: _.assign({ resource: RESOURCES.PROJECT }, project),
        });

        // check context for project members
        project.members = req.context.currentProjectMembers;
        // get attachments
        return util.getProjectAttachments(req, project.id);
      })
      .then((attachments) => {
        // make sure we only send response after transaction is committed
        project.attachments = attachments;
        res.json(project);
      })
      .catch(err => next(err));
  },
];
