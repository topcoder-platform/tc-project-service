import _ from 'lodash';
import config from 'config';

import models from '../../models';
import { CONNECT_NOTIFICATION_EVENT, COPILOT_REQUEST_STATUS } from '../../constants';
import util from '../../util';
import { createEvent } from '../../services/busApi';

const resolveTransaction = (transaction, callback) => {
  if (transaction) {
    return callback(transaction);
  }

  return models.sequelize.transaction(callback);
};

module.exports = (req, data, existingTransaction) => {
  const { projectId, copilotRequestId } = data;

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
                const roles = await util.getRolesByRoleName('copilot', req.log, req.id);
                req.log.info("getting subjects for roles", roles[0]);
                const { subjects = [] } = await util.getRoleInfo(roles[0], req.log, req.id);
                const emailEventType = CONNECT_NOTIFICATION_EVENT.EXTERNAL_ACTION_EMAIL;
                const copilotPortalUrl = config.get('copilotPortalUrl');
                req.log.info("Sending emails to all copilots about new opportunity");
                req.log.info(`${copilotPortalUrl}/opportunity/${opportunity.id}`, '`${copilotPortalUrl}/opportunity/${opportunity.id}`');
                subjects.forEach(subject => {
                  req.log.info("Each copilot members", subject);
                  createEvent(emailEventType, {
                    data: {
                      userName: subject.handle,
                      opportunityDetailsUrl: `${copilotPortalUrl}/opportunity/${opportunity.id}`,
                    },
                    sendgrid_template_id: "d-3efdc91da580479d810c7acd50a4c17f",
                    recipients: [subject.email],
                    version: '433b1688-c543-4656-a295-efcbea57444d',
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
