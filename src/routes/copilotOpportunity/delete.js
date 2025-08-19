import _ from 'lodash';
import { Op } from 'sequelize';
import config from 'config';

import models from '../../models';
import util from '../../util';
import { CONNECT_NOTIFICATION_EVENT, COPILOT_APPLICATION_STATUS, COPILOT_OPPORTUNITY_STATUS, COPILOT_REQUEST_STATUS, EVENT, INVITE_STATUS, RESOURCES, TEMPLATE_IDS } from '../../constants';
import { createEvent } from '../../services/busApi';
import { PERMISSION } from '../../permissions/constants';


module.exports = [
  (req, res, next) => {
    if (!util.hasPermissionByReq(PERMISSION.CANCEL_COPILOT_OPPORTUNITY, req)) {
      const err = new Error('Unable to cancel copilot opportunity');
      _.assign(err, {
        details: JSON.stringify({ message: 'You do not have permission to cancel copilot opportunity' }),
        status: 403,
      });
      return Promise.reject(err);
    }
    // default values
    const opportunityId = _.parseInt(req.params.id);

    const sendEmailToAllApplicants = async (copilotRequest, applications) => {
      const userIds = applications.map(item => item.userId);
      const users = await util.getMemberDetailsByUserIds(userIds, req.log, req.id);
    
      users.forEach(async (user) => {
        req.log.debug(`Sending email notification to copilots who applied`);
        const emailEventType = CONNECT_NOTIFICATION_EVENT.EXTERNAL_ACTION_EMAIL;
        const copilotPortalUrl = config.get('copilotPortalUrl');
        const requestData = copilotRequest.data;
        createEvent(emailEventType, {
          data: {
            opportunity_details_url: `${copilotPortalUrl}/opportunity`,
            opportunity_title: requestData.opportunityTitle,
            user_name: user ? user.handle : "",
          },
          sendgrid_template_id: TEMPLATE_IDS.COPILOT_OPPORTUNITY_CANCELED,
          recipients: [user.email],
          version: 'v3',
        }, req.log);
      
        req.log.debug(`Email sent to copilots who applied`);
      });
    
    };

    return models.sequelize.transaction(async (transaction) => {
      req.log.debug('Canceling Copilot opportunity transaction', opportunityId);
      const opportunity = await models.CopilotOpportunity.findOne({
        where: { id: opportunityId },
        transaction,
      });

      if (!opportunity) {
        const err = new Error(`No opportunity available for id ${opportunityId}`);
        err.status = 404;
        throw err;
      }

      const copilotRequest = await models.CopilotRequest.findOne({
        where: {
          id: opportunity.copilotRequestId,
        },
        transaction,
      });

      const applications = await models.CopilotApplication.findAll({
        where: {
          opportunityId: opportunity.id,
        },
        transaction,
      });

      const promises = [];
      applications.forEach((application) => {
        promises.push(application.update({
          status: COPILOT_APPLICATION_STATUS.CANCELED,
        }, {
          transaction,
        }));
      });

      const allInvites = await models.ProjectMemberInvite.findAll({
        where: {
          applicationId: {
            [Op.in]: applications.map(item => item.id),
          },
        },
      });

      await Promise.all(promises);

      await copilotRequest.update({
        status: COPILOT_REQUEST_STATUS.CANCELED,
      }, {
        transaction,
      });

      await opportunity.update({
        status: COPILOT_OPPORTUNITY_STATUS.CANCELED,
      }, {
        transaction,
      });

      // update all the existing invites which are 
      // associated to the copilot opportunity
      // with cancel status
      for (const invite of allInvites) {
        await invite.update({
          status: INVITE_STATUS.CANCELED,
        });
        await invite.reload();
        util.sendResourceToKafkaBus(
          req,
          EVENT.ROUTING_KEY.PROJECT_MEMBER_INVITE_UPDATED,
          RESOURCES.PROJECT_MEMBER_INVITE,
          invite.toJSON());
      }

      await sendEmailToAllApplicants(copilotRequest, applications)

      res.status(200).send({ id: opportunity.id });
    })
        
      .catch((err) => {
        if (err.message) {
          _.assign(err, { details: err.message });
        }
        util.handleError('Error canceling copilot opportunity', err, req, next);
      });
  },
];
