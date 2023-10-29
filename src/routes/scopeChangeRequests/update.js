import _ from 'lodash';
import Joi from 'joi';
import validate from 'express-validation';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import util from '../../util';
import {
  SCOPE_CHANGE_REQ_STATUS,
  PROJECT_MEMBER_ROLE,
  USER_ROLE,
  PROJECT_MEMBER_MANAGER_ROLES,
  EVENT,
} from '../../constants';
import models from '../../models';

/**
 * API to add a scope change request for a project.
 */
const permissions = tcMiddleware.permissions;

const updateScopeChangeRequestValidations = {
  body: {
    status: Joi.string().valid(_.values(SCOPE_CHANGE_REQ_STATUS)),
  },
};

/**
 * Merges the new scope that's being activated into the details json of the project and updates the db
 * @param {Object} req The request object
 * @param {Object} newScope The new scope to apply
 * @param {string} projectId The project id
 *
 * @returns {Promise} The promise to update the project with merged data
 */
function updateProjectDetails(req, newScope, projectId) {
  return models.Project.findByPk(projectId).then((project) => {
    const previousValue = _.clone(project.get({ plain: true }));

    if (!project) {
      const err = new Error('Project not found');
      err.status = 404;
      return Promise.reject(err);
    }

    const updatedDetails = _.mergeWith(
      {}, project.details, newScope,
      (_objValue, srcValue) => {
        if (_.isArray(srcValue)) {
          return srcValue;
        }
        return undefined;
      });

    return project.update({ details: updatedDetails }).then((updatedProject) => {
      const updated = updatedProject.get({ plain: true });
      const original = _.omit(previousValue, ['deletedAt', 'deletedBy']);

      req.app.emit(EVENT.ROUTING_KEY.PROJECT_UPDATED, { req, original, updated });

      return updatedProject;
    });
  });
}

module.exports = [
  // handles request validations
  validate(updateScopeChangeRequestValidations),
  permissions('project.edit'),
  (req, res, next) => {
    const projectId = _.parseInt(req.params.projectId);
    const requestId = _.parseInt(req.params.requestId);
    const updatedProps = req.body;
    const members = req.context.currentProjectMembers;
    const member = _.find(members, m => m.userId === req.authUser.userId);
    const isCustomer = member && member.role === PROJECT_MEMBER_ROLE.CUSTOMER;
    // const isCopilot = member && member.role === PROJECT_MEMBER_ROLE.COPILOT;
    const isManager = member && PROJECT_MEMBER_MANAGER_ROLES.indexOf(member.role) > -1;
    const isAdmin = util.hasRoles(req, [USER_ROLE.CONNECT_ADMIN, USER_ROLE.TOPCODER_ADMIN]);

    req.log.debug('finding scope change', requestId);
    return models.ScopeChangeRequest.findScopeChangeRequest(projectId, { requestId })
      .then((scopeChangeReq) => {
      // req.log.debug(scopeChangeReq);
        if (!scopeChangeReq) {
          const err = new Error('Scope change request does not exist');
          err.status = 404;
          return next(err);
        }
        const statusesForCustomers = [SCOPE_CHANGE_REQ_STATUS.APPROVED, SCOPE_CHANGE_REQ_STATUS.REJECTED];
        if (statusesForCustomers.indexOf(updatedProps.status) > -1 && !isCustomer && !isAdmin) {
          const err = new Error('Only customer can approve the request');
          err.status = 401;
          return next(err);
        }
        const statusesForManagers = [SCOPE_CHANGE_REQ_STATUS.ACTIVATED];
        if (statusesForManagers.indexOf(updatedProps.status) > -1 && !isManager && !isAdmin) {
          const err = new Error('Only managers can activate the request');
          err.status = 401;
          return next(err);
        }
        const statusesForSelf = [SCOPE_CHANGE_REQ_STATUS.CANCELED];
        const isSelf = scopeChangeReq.createdBy === req.authUser.userId;
        if (statusesForSelf.indexOf(updatedProps.status) > -1 && !isSelf && !isAdmin) {
          const err = new Error('One can cancel only own requests');
          err.status = 401;
          return next(err);
        }

        return (
          updatedProps.status === SCOPE_CHANGE_REQ_STATUS.ACTIVATED
            ? updateProjectDetails(req, scopeChangeReq.newScope, projectId)
            : Promise.resolve()
        )
          .then(() => scopeChangeReq.update(updatedProps))
          .then((_updatedReq) => {
            res.json(_updatedReq);
            return Promise.resolve();
          });
      })
      .catch(err => next(err));
  },
];
