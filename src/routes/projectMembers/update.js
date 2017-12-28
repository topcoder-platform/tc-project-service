
import validate from 'express-validation';
import _ from 'lodash';
import Joi from 'joi';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import models from '../../models';
import util from '../../util';
import { EVENT, PROJECT_MEMBER_ROLE } from '../../constants';

/**
 * API to update a project member.
 */
const permissions = tcMiddleware.permissions;

const updateProjectMemberValdiations = {
  body: {
    param: Joi.object().keys({
      isPrimary: Joi.boolean(),
      role: Joi.any().valid(PROJECT_MEMBER_ROLE.CUSTOMER, PROJECT_MEMBER_ROLE.MANAGER,
        PROJECT_MEMBER_ROLE.COPILOT).required(),
    }),
  },
};

module.exports = [
  // handles request validations
  validate(updateProjectMemberValdiations),
  permissions('project.updateMember'),
  /**
   * Update a projectMember if the user has access
   */
  (req, res, next) => {
    let projectMember;
    let updatedProps = req.body.param;
    const projectId = _.parseInt(req.params.projectId);
    const memberRecordId = _.parseInt(req.params.id);
    updatedProps = _.pick(updatedProps, ['isPrimary', 'role']);

    let previousValue;
    // let newValue;
    models.sequelize.transaction(() => models.ProjectMember.findOne({
      where: { id: memberRecordId, projectId },
    })
        .then((_member) => {
          if (!_member) {
            // handle 404
            const err = new Error(`project member not found for project id ${projectId} ` +
              `and member id ${memberRecordId}`);
            err.status = 404;
            return Promise.reject(err);
          }

          projectMember = _member;
          previousValue = _.clone(projectMember.get({ plain: true }));
          _.assign(projectMember, updatedProps);
          // newValue = projectMember.get({ plain: true });

          // no updates if no change
          if (updatedProps.role === previousValue.role &&
              (_.isUndefined(updatedProps.isPrimary) ||
                updatedProps.isPrimary === previousValue.isPrimary)) {
            return Promise.resolve();
          }

          projectMember.updatedBy = req.authUser.userId;
          const operations = [];
          operations.push(projectMember.save());

          if (updatedProps.isPrimary) {
            // if set as primary, other users with same role should no longer be primary
            operations.push(models.ProjectMember.update({ isPrimary: false,
              updatedBy: req.authUser.userId },
              {
                where: {
                  projectId,
                  isPrimary: true,
                  role: updatedProps.role,
                  id: {
                    $ne: projectMember.id,
                  },
                },
              }));
          }
          return Promise.all(operations);
        })
        // .then(() => {
        //   // TODO move this to an event
        //   // if copilot role is added or removed should invoke related direct project service
        //   if(previousValue.role !== newValue.role && (previousValue.role === PROJECT_MEMBER_ROLE.COPILOT
        //       || newValue.role === PROJECT_MEMBER_ROLE.COPILOT)) {
        //     return models.Project.getDirectProjectId(projectId)
        //         .then(directProjectId => {
        //           if(directProjectId) {
        //             if(previousValue.role === PROJECT_MEMBER_ROLE.COPILOT) {
        //               // new role not copilot so remove direct project copilot
        //               return directProject.deleteCopilot(req, directProjectId, {
        //                 copilotUserId: projectMember.userId
        //               })
        //             } else {
        //               // new role is copilot so add direct project copilot
        //               return directProject.addCopilot(req, directProjectId, {
        //                 copilotUserId: projectMember.userId
        //               })
        //             }
        //           } else {
        //             return Promise.resolve()
        //           }
        //         })
        //
        //   } else  {
        //     return Promise.resolve()
        //   }
        // })
        .then(() => projectMember.reload(projectMember.id))
        .then(() => {
          projectMember = projectMember.get({ plain: true });
          projectMember = _.omit(projectMember, ['deletedAt']);
          // emit original and updated project information
          req.app.services.pubsub.publish(
            EVENT.ROUTING_KEY.PROJECT_MEMBER_UPDATED,
            { original: previousValue, updated: projectMember },
            { correlationId: req.id },
          );
          req.app.emit(EVENT.ROUTING_KEY.PROJECT_MEMBER_UPDATED,
            { req, original: previousValue, updated: projectMember });
          req.log.debug('updated project member', projectMember);
          res.json(util.wrapResponse(req.id, projectMember));
        })
        .catch(err => next(err)));
  },
];
