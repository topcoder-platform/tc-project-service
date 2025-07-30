import _ from 'lodash';
import validate from 'express-validation';
import Joi from 'joi';
import config from 'config';

import models from '../../models';
import util from '../../util';
import { PERMISSION } from '../../permissions/constants';
import { CONNECT_NOTIFICATION_EVENT, COPILOT_APPLICATION_STATUS, COPILOT_OPPORTUNITY_STATUS, COPILOT_REQUEST_STATUS, EVENT, INVITE_STATUS, PROJECT_MEMBER_ROLE, RESOURCES, TEMPLATE_IDS } from '../../constants';
import { getCopilotTypeLabel } from '../../utils/copilot';

const assignCopilotOpportunityValidations = {
  body: Joi.object().keys({
    applicationId: Joi.string(),
  }),
};

module.exports = [
  validate(assignCopilotOpportunityValidations),
  async (req, res, next) => {
    const { applicationId } = req.body;
    const copilotOpportunityId = _.parseInt(req.params.id);
    if (!util.hasPermissionByReq(PERMISSION.ASSIGN_COPILOT_OPPORTUNITY, req)) {
      const err = new Error('Unable to assign copilot opportunity');
      _.assign(err, {
        details: JSON.stringify({ message: 'You do not have permission to assign a copilot opportunity' }),
        status: 403,
      });
      return next(err);
    }

    return models.sequelize.transaction(async (t) => {
      const opportunity = await models.CopilotOpportunity.findOne({
        where: { id: copilotOpportunityId },
        transaction: t,
      });

      if (!opportunity) {
        const err = new Error('No opportunity found');
        err.status = 404;
        throw err;
      }

      if (opportunity.status !== COPILOT_OPPORTUNITY_STATUS.ACTIVE) {
        const err = new Error('Opportunity is not active');
        err.status = 400;
        throw err;
      }

      const copilotRequest = await models.CopilotRequest.findOne({
        where: { id: opportunity.copilotRequestId },
        transaction: t,
      });

      const application = await models.CopilotApplication.findOne({
        where: { id: applicationId, opportunityId: copilotOpportunityId },
        transaction: t,
      });


      if (!application) {
        const err = new Error('No such application available');
        err.status = 400;
        throw err;
      }

      if (application.status === COPILOT_APPLICATION_STATUS.ACCEPTED) {
        const err = new Error('Application already accepted');
        err.status = 400;
        throw err;
      }

      const projectId = opportunity.projectId;
      const userId = application.userId;
      const activeMembers = await models.ProjectMember.getActiveProjectMembers(projectId, t);
      const updateCopilotOpportunity = async () => {
        const transaction = await models.sequelize.transaction();
        const memberDetails = await util.getMemberDetailsByUserIds([application.userId], req.log, req.id);
        const member = memberDetails[0];
        req.log.debug(`Updating opportunity: ${JSON.stringify(opportunity)}`);
        await opportunity.update({
          status: COPILOT_OPPORTUNITY_STATUS.COMPLETED,
        }, {
          transaction,
        });
        req.log.debug(`Updating application: ${JSON.stringify(application)}`);
        await application.update({
          status: COPILOT_APPLICATION_STATUS.ACCEPTED,
        }, {
          transaction,
        });

        req.log.debug(`Updating request: ${JSON.stringify(copilotRequest)}`);
        await copilotRequest.update({
          status: COPILOT_REQUEST_STATUS.FULFILLED,
        }, {
          transaction,
        });

        req.log.debug(`Updating other applications: ${JSON.stringify(copilotRequest)}`);
        await models.CopilotApplication.update({
          status: COPILOT_APPLICATION_STATUS.CANCELED,
        }, {
          where: {
            opportunityId: opportunity.id,
            id: {
              $ne: application.id,
            },
          }
        });

        req.log.debug(`All updations done`);
        transaction.commit();

        req.log.debug(`Sending email notification`);
        const emailEventType = CONNECT_NOTIFICATION_EVENT.EXTERNAL_ACTION_EMAIL;
        const copilotPortalUrl = config.get('copilotPortalUrl');
        const requestData = copilotRequest.data;
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

        req.log.debug(`Email sent`);
      };

      const existingMember = activeMembers.find(item => item.userId === userId);
      if (existingMember) {
        req.log.debug(`User already part of project: ${JSON.stringify(existingMember)}`);
        if (['copilot', 'manager'].includes(existingMember.role)) {
          req.log.debug(`User is a copilot or manager`);
          await updateCopilotOpportunity();
        } else {
          req.log.debug(`User has read/write role`);
          await models.ProjectMember.update({
            role: 'copilot',
          }, {
            where: {
              id: existingMember.id,
            },
          });

          const projectMember = await models.ProjectMember.findOne({
            where: {
              id: existingMember.id,
            },
          });

          req.log.debug(`Updated project member: ${JSON.stringify(projectMember.get({plain: true}))}`);

          util.sendResourceToKafkaBus(
            req,
            EVENT.ROUTING_KEY.PROJECT_MEMBER_UPDATED,
            RESOURCES.PROJECT_MEMBER,
            projectMember.get({ plain: true }),
            existingMember);
          req.log.debug(`Member updated in kafka`);
          await updateCopilotOpportunity();
        }
        res.status(200).send({ id: applicationId });
        return;
      }

      const existingInvite = await models.ProjectMemberInvite.findAll({
        where: {
          userId,
          projectId,
          role: PROJECT_MEMBER_ROLE.COPILOT,
          status: INVITE_STATUS.PENDING,
        },
        transaction: t,
      });

      if (existingInvite && existingInvite.length) {
        const err = new Error(`User already has an pending invite to the project`);
        err.status = 400;
        throw err;
      }

      const invite = await models.ProjectMemberInvite.create({
        status: INVITE_STATUS.PENDING,
        role: PROJECT_MEMBER_ROLE.COPILOT,
        userId,
        projectId,
        applicationId: application.id,
        createdBy: req.authUser.userId,
        createdAt: new Date(),
        updatedBy: req.authUser.userId,
        updatedAt: new Date(),
      }, {
        transaction: t,
      })

      util.sendResourceToKafkaBus(
        req,
        EVENT.ROUTING_KEY.PROJECT_MEMBER_INVITE_CREATED,
        RESOURCES.PROJECT_MEMBER_INVITE,
        Object.assign({}, invite.toJSON(), {
          source: 'copilot_portal',
        }),
      );

      await application.update({
        status: COPILOT_APPLICATION_STATUS.INVITED,
      }, {
        transaction: t,
      });

      res.status(200).send({ id: applicationId });
    }).catch(err => next(err));
  },
];
