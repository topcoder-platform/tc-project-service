import validate from 'express-validation';
import _ from 'lodash';
import Joi from 'joi';
import { Op } from 'sequelize';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import models from '../../models';
import util from '../../util';
import { INVITE_STATUS, EVENT, RESOURCES, COPILOT_APPLICATION_STATUS, COPILOT_OPPORTUNITY_STATUS, COPILOT_REQUEST_STATUS, INVITE_SOURCE } from '../../constants';
import { PERMISSION } from '../../permissions/constants';


/**
 * API to update invite member to project.
 *
 */
const permissions = tcMiddleware.permissions;

const updateMemberValidations = {
  body: Joi.object()
    .keys({
      status: Joi.any()
        .valid(_.values(INVITE_STATUS))
        .required(),
      source: Joi
        .string()
        .optional()
        .default(INVITE_SOURCE.WORK_MANAGER),
    })
    .required(),
};

module.exports = [
  // handles request validations
  validate(updateMemberValidations),
  permissions('projectMemberInvite.edit'),
  (req, res, next) => {
    const newStatus = req.body.status;
    const source = req.body.source;
    if (newStatus === INVITE_STATUS.CANCELED) {
      const err = new Error('Cannot change invite status to “canceled”. Please, delete the invite instead.');
      err.status = 400;
      return next(err);
    }
    const projectId = _.parseInt(req.params.projectId);
    const inviteId = _.parseInt(req.params.inviteId);
    const currentUserEmail = req.authUser.email ? req.authUser.email.toLowerCase() : req.authUser.email;
    const currentUserId = req.authUser.userId;

    // get invite by id and project id
    return models.ProjectMemberInvite.getPendingOrRequestedProjectInviteById(projectId, inviteId)
      .then((invite) => {
        // if invite doesn't exist, return 404
        if (!invite) {
          const err = new Error(`invite not found for project id ${projectId}, inviteId ${inviteId},` +
            ` email ${currentUserEmail} and userId ${currentUserId}`,
          );
          err.status = 404;
          return next(err);
        }
        // check this invitation is for logged-in user or not
        const ownInvite = (!!invite && (invite.userId === currentUserId || invite.email === currentUserEmail));

        // check permission
        req.log.debug('Checking user permission for updating invite');
        let error = null;

        if (
          invite.status === INVITE_STATUS.REQUESTED
          && !util.hasPermissionByReq(PERMISSION.UPDATE_PROJECT_INVITE_REQUESTED, req)
        ) {
          error = 'You don\'t have permissions to update requested invites.';
        } else if (
          invite.status !== INVITE_STATUS.REQUESTED
          && !ownInvite
          && !util.hasPermissionByReq(PERMISSION.UPDATE_PROJECT_INVITE_NOT_OWN, req)
        ) {
          error = 'You don\'t have permissions to update invites for other users.';
        }

        if (error) {
          const err = new Error(error);
          err.status = 403;
          return next(err);
        }

        req.log.debug('Updating invite status');
        return invite
          .update({
            status: newStatus,
          })
          .then(async (updatedInvite) => {
            // emit the event
            util.sendResourceToKafkaBus(
              req,
              EVENT.ROUTING_KEY.PROJECT_MEMBER_INVITE_UPDATED,
              RESOURCES.PROJECT_MEMBER_INVITE,
              updatedInvite.toJSON());

            req.log.debug('Adding user to project');
            // add user to project if accept invite
            if (updatedInvite.status === INVITE_STATUS.ACCEPTED ||
              updatedInvite.status === INVITE_STATUS.REQUEST_APPROVED) {
              return models.ProjectMember.getActiveProjectMembers(projectId)
                .then(async (members) => {
                  req.context = req.context || {};
                  req.context.currentProjectMembers = members;
                  let userId = updatedInvite.userId;
                  // if the requesting user is updating his/her own invite
                  if (!userId && currentUserEmail === updatedInvite.email) {
                    userId = currentUserId;
                  }
                  // if we are not able to identify the user yet, it must be something wrong and we should not create
                  // project member
                  if (!userId) {
                    const err = new Error(
                      `Unable to find userId for the invite. ${updatedInvite.email} has not joined topcoder yet.`);
                    err.status = 400;
                    return next(err);
                  }
                  const member = {
                    projectId,
                    role: updatedInvite.role,
                    userId,
                    createdBy: req.authUser.userId,
                    updatedBy: req.authUser.userId,
                  };
                  const t = await models.sequelize.transaction();
                  try {
                    await util.addUserToProject(req, member, t);
                    if (invite.applicationId) {
                      let nextApplicationStatus = COPILOT_APPLICATION_STATUS.CANCELED;
                      let nextOpportunityStatus = COPILOT_OPPORTUNITY_STATUS.CANCELED;
                      let nextOpportunityRequestStatus = COPILOT_REQUEST_STATUS.CANCELED;
                      if (source === 'copilot_portal') {
                        nextApplicationStatus = COPILOT_APPLICATION_STATUS.ACCEPTED;
                        nextOpportunityStatus = COPILOT_OPPORTUNITY_STATUS.COMPLETED;
                        nextOpportunityRequestStatus = COPILOT_REQUEST_STATUS.FULFILLED;
                      }

                      const application = await models.CopilotApplication.findOne({
                        where: {
                          id: invite.applicationId,
                        },
                        transaction: t,
                      });

                      await application.update({ status: nextApplicationStatus }, {
                        transaction: t
                      });

                      const opportunity = await models.CopilotOpportunity.findOne({
                        where: {
                          id: application.opportunityId,
                        },
                        transaction: t,
                      });

                      await opportunity.update({
                        status: nextOpportunityStatus,
                      }, {
                        transaction: t,
                      });

                      const request = await models.CopilotRequest.findOne({
                        where: {
                          id: opportunity.copilotRequestId,
                        },
                        transaction: t,
                      });

                      await request.update({
                        status: nextOpportunityRequestStatus,
                      }, {
                        transaction: t,
                      });
                    } else if (source === INVITE_SOURCE.WORK_MANAGER) {
                      const allCopilotRequestsByProjectId = await models.CopilotRequest.findAll({
                        where: {
                          projectId: invite.projectId,
                        },
                        transaction: t,
                      });

                      const requestIds = allCopilotRequestsByProjectId.map(item => item.id);

                      await models.CopilotRequest.update({
                        status: COPILOT_REQUEST_STATUS.CANCELED,
                      }, {
                        where: {
                          id: {
                            [Op.in]: requestIds,
                          }
                        },
                        transaction: t,
                      });

                      const allCopilotOpportunityByRequestIds = await models.CopilotOpportunity.findAll({
                        where: {
                          copilotRequestId: {
                            [Op.in]: requestIds,
                          },
                        },
                        transaction: t,
                      });

                      await models.CopilotOpportunity.update({
                        status: COPILOT_OPPORTUNITY_STATUS.CANCELED,
                      }, {
                        where: {
                          id: {
                            [Op.in]: allCopilotOpportunityByRequestIds.map(item => item.id),
                          },
                        },
                        transaction: t,
                      });

                      const copilotApplications = await models.CopilotApplication.findAll({
                        where: {
                          opportunityId: {
                            [Op.in]: allCopilotOpportunityByRequestIds.map(item => item.id),
                          },
                        },
                        transaction: t,
                      });

                      await models.CopilotApplication.update({
                        status: COPILOT_APPLICATION_STATUS.CANCELED,
                      }, {
                        where: {
                          id: {
                            [Op.in]: copilotApplications.map(item => item.id),
                          },
                        },
                        transaction: t,
                      });

                      const invitesToBeUpdated = await models.ProjectMemberInvite.findAll({
                        where: {
                          applicationId: {
                            [Op.in]: copilotApplications.map(item => item.id),
                          }
                        },
                        transaction: t,
                      });

                      // Cancel the existing invites which are opened via 
                      // applications
                      await models.ProjectMemberInvite.update({
                        status: INVITE_STATUS.CANCELED,
                      }, {
                        where: {
                          applicationId: {
                            [Op.in]: copilotApplications.map(item => item.id),
                          }
                        },
                        transaction: t,
                      });

                      invitesToBeUpdated.forEach((inviteToBeUpdated) => {
                        util.sendResourceToKafkaBus(
                          req,
                          EVENT.ROUTING_KEY.PROJECT_MEMBER_INVITE_UPDATED,
                          RESOURCES.PROJECT_MEMBER_INVITE,
                          inviteToBeUpdated.toJSON());
                      })
                    }

                    await t.commit();
                    return res.json(util.postProcessInvites('$.email', updatedInvite, req));
                  } catch (e) {
                    await t.rollback();
                    return next(e);
                  }
                });
            } else if (updatedInvite.status === INVITE_STATUS.REFUSED) {
              // update the application if the invite
              // originated from copilot opportunity
              if (updatedInvite.applicationId) {
                const allPendingInvitesForApplication = await models.ProjectMemberInvite.getPendingInvitesForApplication(invite.applicationId);
                // If only the current invite is the open one's
                // then the application status has to be moved to pending status
                if (allPendingInvitesForApplication.length === 0) {
                  await models.CopilotApplication.update({
                    status: COPILOT_APPLICATION_STATUS.PENDING,
                  }, {
                    where: {
                      id: updatedInvite.applicationId,
                    },
                  });
                }
              }
            }
            return res.json(util.postProcessInvites('$.email', updatedInvite, req));
          });
      })
      .catch(next);
  },
];
