import _ from 'lodash';
import validate from 'express-validation';
import Joi from 'joi';
import config from 'config';

import models from '../../models';
import util from '../../util';
import { PERMISSION } from '../../permissions/constants';
import { createEvent } from '../../services/busApi';
import { CONNECT_NOTIFICATION_EVENT, COPILOT_APPLICATION_STATUS, COPILOT_OPPORTUNITY_STATUS, COPILOT_REQUEST_STATUS, EVENT, INVITE_STATUS, PROJECT_MEMBER_ROLE, RESOURCES } from '../../constants';

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

      const application = await models.CopilotApplication.findOne({
        where: { id: applicationId },
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
      const activeMembers = await models.ProjectMember.getActiveProjectMembers(projectId);

      const existingUser = activeMembers.find(item => item.userId === userId);
      if (existingUser && existingUser.role === 'copilot') {
        const err = new Error(`User is already a copilot of this project`);
        err.status = 400;
        throw err;
      }

      const project = await models.Project.findOne({
        where: {
          id: projectId,
        },
      });

      const applicationUser = await util.getMemberDetailsByUserIds([userId], req.log, req.id);

      req.log.info("before create", applicationUser, userId)

      const invite = await models.ProjectMemberInvite.create({
        status: INVITE_STATUS.PENDING,
        role: PROJECT_MEMBER_ROLE.COPILOT,
        userId,
        email: applicationUser.email,
      })

      req.log.info("aftr create", invite)

      util.sendResourceToKafkaBus(
        req,
        EVENT.ROUTING_KEY.PROJECT_MEMBER_INVITE_CREATED,
        RESOURCES.PROJECT_MEMBER_INVITE,
        invite.toJSON());

      const initiator = await util.getMemberDetailsByUserIds([req.authUser.userId], req.log, req.id);

      const emailEventType = CONNECT_NOTIFICATION_EVENT.PROJECT_MEMBER_EMAIL_INVITE_CREATED;
      await createEvent(emailEventType, {
        data: {
          workManagerUrl: config.get('workManagerUrl'),
          accountsAppURL: config.get('accountsAppUrl'),
          subject: config.get('inviteEmailSubject'),
          projects: [{
            name: project.name,
            projectId,
            sections: [
              {
                EMAIL_INVITES: true,
                title: config.get('inviteEmailSectionTitle'),
                projectName: project.name,
                projectId,
                initiator,
                isSSO: util.isSSO(project),
              },
            ],
          }],
        },
        recipients: [applicationUser.email],
        version: 'v3',
        from: {
          name: config.get('EMAIL_INVITE_FROM_NAME'),
          email: config.get('EMAIL_INVITE_FROM_EMAIL'),
        },
        categories: [`${process.env.NODE_ENV}:${emailEventType}`.toLowerCase()],
      }, req.log);

      await models.CopilotRequest.update(
        { status: COPILOT_REQUEST_STATUS.FULFILLED },
        { where: { id: opportunity.copilotRequestId }, transaction: t },
      );

      await opportunity.update(
        { status: COPILOT_OPPORTUNITY_STATUS.COMPLETED },
        { transaction: t },
      );

      await models.CopilotApplication.update(
        { status: COPILOT_APPLICATION_STATUS.ACCEPTED },
        { where: { id: applicationId }, transaction: t },
      );

      res.status(200).send({ id: applicationId });
    }).catch(err => next(err));
  },
];
