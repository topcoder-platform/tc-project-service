import _ from 'lodash';
import Joi from 'joi';
import validate from 'express-validation';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import { SCOPE_CHANGE_REQ_STATUS, PROJECT_MEMBER_ROLE, PROJECT_STATUS } from '../../constants';
import models from '../../models';

/**
 * API to add a scope change request for a project.
 */
const permissions = tcMiddleware.permissions;

const createScopeChangeRequestValidations = {
  body: {
    oldScope: Joi.object(),
    newScope: Joi.object(),
  },
};

module.exports = [
  // handles request validations
  validate(createScopeChangeRequestValidations),
  permissions('project.edit'),
  (req, res, next) => {
    const projectId = _.parseInt(req.params.projectId);
    const oldScope = _.get(req, 'body.oldScope');
    const newScope = _.get(req, 'body.newScope');
    const members = req.context.currentProjectMembers;
    const isCustomer = !_.isUndefined(_.find(members,
      m => m.userId === req.authUser.userId && m.role === PROJECT_MEMBER_ROLE.CUSTOMER));

    const scopeChange = {
      oldScope,
      newScope,
      status: isCustomer ? SCOPE_CHANGE_REQ_STATUS.APPROVED : SCOPE_CHANGE_REQ_STATUS.PENDING,
      projectId,
      createdBy: req.authUser.userId,
      updatedBy: req.authUser.userId,
    };

    return models.Project.findOne({
      where: { id: projectId },
    })

      .then((project) => {
        if (!project) {
          const err = new Error(`Project with id ${projectId} not found`);
          err.status = 404;
          return Promise.reject(err);
        }

        // If the project is not frozen yet, the changes can be saved directly into projects db.
        // Scope change request workflow is not required.
        const statusesForNonFrozenProjects = [PROJECT_STATUS.DRAFT, PROJECT_STATUS.IN_REVIEW];
        if (statusesForNonFrozenProjects.indexOf(project.status) > -1) {
          const err = new Error(
            `Cannot create a scope change request for projects with statuses: ${
              statusesForNonFrozenProjects.join(', ')}`);
          err.status = 403;
          return Promise.reject(err);
        }

        return models.ScopeChangeRequest.findPendingScopeChangeRequest(projectId);
      })

      .then((pendingScopeChangeReq) => {
        if (pendingScopeChangeReq) {
          const err = new Error('Cannot create a new scope change request while there is a pending request');
          err.status = 403;
          return Promise.reject(err);
        }

        req.log.debug('creating scope change request');
        return models.ScopeChangeRequest.create(scopeChange);
      })

      .then((_newScopeChange) => {
        req.log.debug('Created scope change request');
        res.json(_newScopeChange);
        return Promise.resolve();
      })

      .catch(err => next(err));
  },
];
