import _ from 'lodash';
import config from 'config';
import moment from 'moment';
import { Op } from 'sequelize';

import models from '../../models';
import { CONNECT_NOTIFICATION_EVENT, COPILOT_REQUEST_STATUS, TEMPLATE_IDS, USER_ROLE } from '../../constants';
import util from '../../util';
import { createEvent } from '../../services/busApi';
import { getCopilotTypeLabel } from '../../utils/copilot';

const resolveTransaction = (transaction, callback) => {
  if (transaction) {
    return callback(transaction);
  }

  return models.sequelize.transaction(callback);
};

module.exports = (req, data, existingTransaction) => {
  const { projectId, copilotRequestId, opportunityTitle, type, startDate } = data;

  return resolveTransaction(existingTransaction, transaction =>
    models.Project.findOne({
      where: { id: projectId, deletedAt: { $eq: null } },
    }, { transaction })
      .then((existingProject) => {
        if (!existingProject) {
          const err = new Error(`active project not found for project id ${projectId}`);
          err.status = 404;
          throw err;
        }
        return models.CopilotRequest.findByPk(copilotRequestId, { transaction })
          .then((existingCopilotRequest) => {
            if (!existingCopilotRequest) {
              const err = new Error(`no active copilot request found for copilot request id ${copilotRequestId}`);
              err.status = 404;
              throw err;
            }

            return existingCopilotRequest.update({
              status: COPILOT_REQUEST_STATUS.APPROVED,
            }, { transaction }).then(() => models.CopilotOpportunity
              .findOne({
                where: {
                  projectId,
                  type: data.type,
                  status: {
                    [Op.notIn]: [COPILOT_REQUEST_STATUS.CANCELED],
                  }
                },
              })
              .then((existingCopilotOpportunityOfSameType) => {
                if (existingCopilotOpportunityOfSameType) {
                  const err = new Error('There\'s an opportunity of same type already!');
                  _.assign(err, {
                    status: 403,
                  });
                  throw err;
                }
                return models.CopilotOpportunity
                  .create(data, { transaction });
              }))
              .then(async (opportunity) => {
                const roles = await util.getRolesByRoleName(USER_ROLE.TC_COPILOT, req.log, req.id);
                const { subjects = [] } = await util.getRoleInfo(roles[0], req.log, req.id);
                const emailEventType = CONNECT_NOTIFICATION_EVENT.EXTERNAL_ACTION_EMAIL;
                const copilotPortalUrl = config.get('copilotPortalUrl');
                req.log.info("Sending emails to all copilots about new opportunity");
                subjects.forEach(subject => {
                  createEvent(emailEventType, {
                    data: {
                      user_name: subject.handle,
                      opportunity_details_url: `${copilotPortalUrl}/opportunity/${opportunity.id}`,
                      work_manager_url: config.get('workManagerUrl'),
                      opportunity_type: getCopilotTypeLabel(type),
                      opportunity_title: opportunityTitle,
                      start_date: moment.utc(startDate).format("DD-MM-YYYY h:mm:ss a"),
                    },
                    sendgrid_template_id: TEMPLATE_IDS.CREATE_REQUEST,
                    recipients: [subject.email],
                    version: 'v3',
                  }, req.log);
                });

                req.log.info("Finished sending emails to copilots");
                
                return opportunity;
              })
              .catch((err) => {
                transaction.rollback();
                return Promise.reject(err);
              });
          });
      }),
  );
};
