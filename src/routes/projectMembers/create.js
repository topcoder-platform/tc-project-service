

import validate from 'express-validation';
import _ from 'lodash';
import Joi from 'joi';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import models from '../../models';
import util from '../../util';
import { PROJECT_MEMBER_ROLE, MANAGER_ROLES, EVENT } from '../../constants';

/**
 * API to add a project member.
 *
 */
const permissions = tcMiddleware.permissions;

const addMemberValidations = {
  body: {
    param: Joi.object().keys({
      userId: Joi.number().required(),
      isPrimary: Joi.boolean(),
      role: Joi.any().valid(PROJECT_MEMBER_ROLE.CUSTOMER, PROJECT_MEMBER_ROLE.MANAGER,
        PROJECT_MEMBER_ROLE.COPILOT).required(),
    }).required(),
  },
};

module.exports = [
  // handles request validations
  validate(addMemberValidations),
  permissions('project.addMember'),
  (req, res, next) => {
    const member = req.body.param;
    const projectId = _.parseInt(req.params.projectId);

    // set defaults
    _.assign(member, {
      projectId,
      createdBy: req.authUser.userId,
      updatedBy: req.authUser.userId,
    });
    const members = req.context.currentProjectMembers;

    // check if member is already registered
    const existingMember = _.find(members, m => m.userId === member.userId);
    if (existingMember) {
      const err = new Error(`User already registered for role: ${existingMember.role}`);
      err.status = 400;
      return next(err);
    }
    // check if another member is registered for this role as primary,
    // if not mark this member as primary
    if (_.isUndefined(member.isPrimary)) {
      member.isPrimary = _.isUndefined(_.find(members, m => m.isPrimary && m.role === member.role));
    }
    let promise = Promise.resolve();
    if (member.role === PROJECT_MEMBER_ROLE.MANAGER) {
      promise = util.getUserRoles(member.userId, req.log, req.id);
    }
    req.log.debug('creating member', member);
    let newMember = null;
    // register member
    return promise.then((memberRoles) => {
      if (member.role === PROJECT_MEMBER_ROLE.MANAGER
        && (!memberRoles || !util.hasIntersection(MANAGER_ROLES, memberRoles))) {
        const err = new Error('This user can\'t be added as a Manager to the project');
        err.status = 400;
        return next(err);
      }
      return models.ProjectMember.create(member)
      .then((_newMember) => {
        newMember = _newMember.get({ plain: true });
        // publish event
        req.app.services.pubsub.publish(
          EVENT.ROUTING_KEY.PROJECT_MEMBER_ADDED,
          newMember,
          { correlationId: req.id },
        );
        req.app.emit(EVENT.ROUTING_KEY.PROJECT_MEMBER_ADDED, { req, member: newMember });
        res.status(201).json(util.wrapResponse(req.id, newMember, 1, 201));
      })
      .catch((err) => {
        req.log.error('Unable to register ', err);
        next(err);
      });
    });
  },
];
