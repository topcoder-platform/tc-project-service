
import validate from 'express-validation';
import _ from 'lodash';
import Joi from 'joi';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import models from '../../models';
import util from '../../util';
import { EVENT, RESOURCES, PROJECT_MEMBER_ROLE } from '../../constants';
import { PERMISSION, PROJECT_TO_TOPCODER_ROLES_MATRIX } from '../../permissions/constants';

/**
 * API to update a project member.
 */
const permissions = tcMiddleware.permissions;

const updateProjectMemberValdiations = {
  body: Joi.object().keys({
    isPrimary: Joi.boolean(),
    role: Joi.any().valid(
      PROJECT_MEMBER_ROLE.CUSTOMER,
      PROJECT_MEMBER_ROLE.MANAGER,
      PROJECT_MEMBER_ROLE.ACCOUNT_MANAGER,
      PROJECT_MEMBER_ROLE.COPILOT,
      PROJECT_MEMBER_ROLE.OBSERVER,
      PROJECT_MEMBER_ROLE.PROGRAM_MANAGER,
      PROJECT_MEMBER_ROLE.ACCOUNT_EXECUTIVE,
      PROJECT_MEMBER_ROLE.SOLUTION_ARCHITECT,
      PROJECT_MEMBER_ROLE.PROJECT_MANAGER,
    ).required(),
  }),
  query: {
    fields: Joi.string().optional(),
  },
};

module.exports = [
  // handles request validations
  validate(updateProjectMemberValdiations),
  permissions('projectMember.edit'),
  /*
   * Update a projectMember if the user has access
   */
  (req, res, next) => {
    let projectMember;
    let updatedProps = req.body;
    const projectId = _.parseInt(req.params.projectId);
    const memberRecordId = _.parseInt(req.params.id);
    updatedProps = _.pick(updatedProps, ['isPrimary', 'role']);
    const fields = req.query.fields ? req.query.fields.split(',') : null;

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

        if (
          previousValue.userId !== req.authUser.userId &&
            previousValue.role !== PROJECT_MEMBER_ROLE.CUSTOMER &&
            !util.hasPermissionByReq(PERMISSION.UPDATE_PROJECT_MEMBER_NON_CUSTOMER, req)
        ) {
          const err = new Error('You don\'t have permission to update a non-customer member.');
          err.status = 403;
          return Promise.reject(err);
        }

        // no updates if no change
        if (updatedProps.role === previousValue.role &&
              (_.isUndefined(updatedProps.isPrimary) ||
                updatedProps.isPrimary === previousValue.isPrimary)) {
          return Promise.resolve();
        }

        return util.getUserRoles(projectMember.userId, req.log, req.id).then((roles) => {
          if (
            previousValue.role !== updatedProps.role &&
              !util.matchPermissionRule(
                { topcoderRoles: PROJECT_TO_TOPCODER_ROLES_MATRIX[updatedProps.role] },
                { roles },
              )
          ) {
            const err = new Error(
              `User doesn't have required Topcoder roles to have project role "${updatedProps.role}".`,
            );
            err.status = 401;
            throw err;
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
        });
      })
      .then(() => projectMember.reload(projectMember.id))
      .then(() => {
        projectMember = projectMember.get({ plain: true });
        projectMember = _.omit(projectMember, ['deletedAt']);
      })
      .then(() => (
        util.getObjectsWithMemberDetails([projectMember], fields, req)
          .then(([memberWithDetails]) => memberWithDetails)
          .catch((err) => {
            req.log.error('Cannot get user details for member.');
            req.log.debug('Error during getting user details for member.', err);
            // continues without details anyway
            return projectMember;
          })
      ))
      .then((memberWithDetails) => {
        util.sendResourceToKafkaBus(
          req,
          EVENT.ROUTING_KEY.PROJECT_MEMBER_UPDATED,
          RESOURCES.PROJECT_MEMBER,
          projectMember,
          previousValue);
        req.log.debug('updated project member', projectMember);
        res.json(memberWithDetails || projectMember);
      })
      .catch(err => next(err)));
  },
];
