
import validate from 'express-validation';
import _ from 'lodash';
import Joi from 'joi';
import config from 'config';
import moment from 'moment';
import { Op } from 'sequelize';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import models from '../../models';
import util from '../../util';
import { EVENT, RESOURCES, PROJECT_MEMBER_ROLE, COPILOT_REQUEST_STATUS, COPILOT_OPPORTUNITY_STATUS, COPILOT_APPLICATION_STATUS, USER_ROLE, CONNECT_NOTIFICATION_EVENT, TEMPLATE_IDS } from '../../constants';
import { PERMISSION, PROJECT_TO_TOPCODER_ROLES_MATRIX } from '../../permissions/constants';
import { createEvent } from '../../services/busApi';
import { getCopilotTypeLabel } from '../../utils/copilot';


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
    action: Joi.string().allow('').optional(),
  }),
  query: {
    fields: Joi.string().optional(),
  },
};

const completeAllCopilotRequests = async (req, projectId, _transaction, _member) => {
  const allCopilotRequests = await models.CopilotRequest.findAll({
    where: {
      projectId,
      status: {
        [Op.in]: [
          COPILOT_REQUEST_STATUS.APPROVED,
          COPILOT_REQUEST_STATUS.NEW,
          COPILOT_REQUEST_STATUS.SEEKING,
        ],
      }
    },
    transaction: _transaction,
  });

  req.log.debug(`all copilot requests ${JSON.stringify(allCopilotRequests)}`);

  await models.CopilotRequest.update({
    status: COPILOT_REQUEST_STATUS.FULFILLED,
  }, {
    where: {
      id: {
        [Op.in]: allCopilotRequests.map(item => item.id),
      }
    },
    transaction: _transaction,
  });

  req.log.debug(`updated all copilot requests`);

  const copilotOpportunites = await models.CopilotOpportunity.findAll({
    where: {
      copilotRequestId: {
        [Op.in]: allCopilotRequests.map(item => item.id),
      },
    },
    transaction: _transaction,
  });

  req.log.debug(`all copilot opportunities ${JSON.stringify(copilotOpportunites)}`);

  await models.CopilotOpportunity.update({
    status: COPILOT_OPPORTUNITY_STATUS.COMPLETED,
  }, {
    where: {
      id: {
        [Op.in]: copilotOpportunites.map(item => item.id),
      }
    },
    transaction: _transaction,
  });

  req.log.debug(`updated all copilot opportunities`);

  const allCopilotApplications = await models.CopilotApplication.findAll({
    where: {
      opportunityId: {
        [Op.in]: copilotOpportunites.map(item => item.id),
      },
    },
    transaction: _transaction,
  });

  const memberApplication = allCopilotApplications.find(app => app.userId === _member.userId);
  const applicationsWithoutMemberApplication = allCopilotApplications.filter(app => app.userId !== _member.userId);

  req.log.debug(`all copilot applications ${JSON.stringify(allCopilotApplications)}`);

  await models.CopilotApplication.update({
    status: COPILOT_APPLICATION_STATUS.CANCELED,
  }, {
    where: {
      id: {
        [Op.in]: applicationsWithoutMemberApplication.map(item => item.id),
      },
    },
    transaction: _transaction,
  });

  // If the invited member
  if (memberApplication) {
    await models.CopilotApplication.update({
      status: COPILOT_APPLICATION_STATUS.ACCEPTED,
    }, {
      where: {
        id: memberApplication.id,
      },
      transaction: _transaction,
    });
  }

  req.log.debug(`updated all copilot applications`);

  const memberDetails = await util.getMemberDetailsByUserIds([_member.userId], req.log, req.id);
  const member = memberDetails[0];

  req.log.debug(`member details: ${JSON.stringify(member)}`);

  const emailEventType = CONNECT_NOTIFICATION_EVENT.EXTERNAL_ACTION_EMAIL;
  const copilotPortalUrl = config.get('copilotPortalUrl');
  allCopilotRequests.forEach((request) => {
    const requestData = request.data;

    req.log.debug(`Copilot request data: ${JSON.stringify(requestData)}`);
    const opportunity = copilotOpportunites.find(item => item.copilotRequestId === request.id);

    req.log.debug(`Opportunity: ${JSON.stringify(opportunity)}`);
    createEvent(emailEventType, {
      data: {
        opportunity_details_url: `${copilotPortalUrl}/opportunity/${opportunity.id}`,
        work_manager_url: config.get('workManagerUrl'),
        opportunity_type: getCopilotTypeLabel(requestData.projectType),
        opportunity_title: requestData.opportunityTitle,
        start_date: moment.utc(requestData.startDate).format('DD-MM-YYYY'),
        user_name: member ? member.handle : "",
      },
      sendgrid_template_id: TEMPLATE_IDS.COPILOT_ALREADY_PART_OF_PROJECT,
      recipients: [member.email],
      version: 'v3',
    }, req.log);

    req.log.debug(`Sent email to ${member.email}`);
  });

  await _transaction.commit();
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
    const action = updatedProps.action;
    updatedProps = _.pick(updatedProps, ['isPrimary', 'role']);
    const fields = req.query.fields ? req.query.fields.split(',') : null;

    let previousValue;
    // let newValue;
    models.sequelize.transaction(async (_transaction) => models.ProjectMember.findOne({
      where: { id: memberRecordId, projectId },
    })
      .then(async (_member) => {
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

        req.log.debug(`updated props ${JSON.stringify(updatedProps)}`);
        req.log.debug(`previous values ${JSON.stringify(previousValue)}`);
        // no updates if no change
        if ((updatedProps.role === previousValue.role || action === 'complete-copilot-requests') &&
              (_.isUndefined(updatedProps.isPrimary) ||
                updatedProps.isPrimary === previousValue.isPrimary)) {
          await completeAllCopilotRequests(req, projectId, _transaction, _member);
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
      .then(async () => {
        projectMember = projectMember.get({ plain: true });
        projectMember = _.omit(projectMember, ['deletedAt']);

        if (['observer', 'customer'].includes(updatedProps.role)) {
          await completeAllCopilotRequests(req, projectId, _transaction, _member);
        }
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
      .catch(async (err) => {
        await _transaction.rollback();
        return next(err);
      }));
  },
];
