import _ from 'lodash';
import Joi from 'joi';
import validate from 'express-validation';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import util from '../../util';
import { SCOPE_CHANGE_REQ_STATUS, PROJECT_MEMBER_ROLE } from '../../constants';
import models from '../../models';

/**
 * API to add a scope change request for a project.
 */
const permissions = tcMiddleware.permissions;

const createScopeChangeRequestValidations = {
  body: {
    param: Joi.object()
      .keys({
        title: Joi.string().max(90),
        description: Joi.string().max(255),
        oldScope: Joi.object(),
        newScope: Joi.object(),
      }),
  },
};

module.exports = [
  // handles request validations
  validate(createScopeChangeRequestValidations),
  permissions('project.edit'),
  (req, res, next) => {
    const projectId = _.parseInt(req.params.projectId);
    const title = _.get(req, 'body.param.title');
    const description = _.get(req, 'body.param.description');
    const oldScope = _.get(req, 'body.param.oldScope');
    const newScope = _.get(req, 'body.param.newScope');
    const members = req.context.currentProjectMembers;
    const isCustomer = !_.isUndefined(_.find(members,
        m => m.userId === req.authUser.userId && m.role === PROJECT_MEMBER_ROLE.CUSTOMER));

    const scopeChange = {
      title,
      description,
      oldScope,
      newScope,
      status: isCustomer ? SCOPE_CHANGE_REQ_STATUS.APPROVED : SCOPE_CHANGE_REQ_STATUS.PENDING,
      projectId,
      createdBy: req.authUser.userId,
      updatedBy: req.authUser.userId,
    };

    req.log.debug('creating scope change', scopeChange);
    return models.ScopeChangeRequest.create(scopeChange).then((_newScopeChange) => {
      req.log.debug(_newScopeChange);
      res.json(util.wrapResponse(req.id, _newScopeChange));
      return Promise.resolve();
    })
    .catch(err => next(err));
  },
];
