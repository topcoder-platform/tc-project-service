import config from 'config';
import moment from 'moment';
import { Op } from 'sequelize';
import Promise from 'bluebird';

import models from '../../models';
import {
  CONNECT_NOTIFICATION_EVENT,
  COPILOT_OPPORTUNITY_STATUS,
  COPILOT_REQUEST_STATUS,
  TEMPLATE_IDS,
  USER_ROLE,
} from '../../constants';
import util from '../../util';
import { createEvent } from '../../services/busApi';
import { getCopilotTypeLabel } from '../../utils/copilot';

const resolveTransaction = (transaction, callback) => {
  if (transaction) {
    return callback(transaction);
  }

  return models.sequelize.transaction(callback);
};

const EMAIL_BATCH_SIZE = config.has('copilotEmailBatchSize') ? config.get('copilotEmailBatchSize') : 500;
const EMAIL_CONCURRENCY = config.has('copilotEmailConcurrency') ? config.get('copilotEmailConcurrency') : 20;
const PER_RECIPIENT_DEBUG = config.has('copilotEmailPerRecipientDebug') ?
  config.get('copilotEmailPerRecipientDebug') : false;


module.exports = async (req, data, existingTransaction) => {
  const { projectId, copilotRequestId, opportunityTitle, type, startDate } = data;

  return resolveTransaction(existingTransaction, async (transaction) => {
    try {
      const existingProject = await models.Project.findOne({
        where: { id: projectId, deletedAt: { $eq: null } },
        transaction,
      });

      if (!existingProject) {
        const err = new Error(`active project not found for project id ${projectId}`);
        err.status = 404;
        throw err;
      }

      const copilotRequest = await models.CopilotRequest.findByPk(copilotRequestId, { transaction });

      if (!copilotRequest) {
        const err = new Error(`no active copilot request found for copilot request id ${copilotRequestId}`);
        err.status = 404;
        throw err;
      }

      await copilotRequest.update({ status: COPILOT_REQUEST_STATUS.APPROVED }, { transaction });

      const existingOpportunity = await models.CopilotOpportunity.findOne({
        where: {
          projectId,
          type: data.type,
          status: { [Op.in]: [COPILOT_OPPORTUNITY_STATUS.ACTIVE] },
        },
        transaction,
      });

      if (existingOpportunity) {
        const err = new Error('There\'s an active opportunity of same type already!');
        err.status = 403;
        throw err;
      }

      const opportunity = await models.CopilotOpportunity.create(data, { transaction });
      req.log.debug('Created new copilot opportunity', { opportunityId: opportunity.id });

      // Send notifications
      try {
        const roles = await util.getRolesByRoleName(USER_ROLE.TC_COPILOT, req.log, req.id);

        const { subjects = [] } = await util.getRoleInfo(roles[0], req.log, req.id);
        const emailEventType = CONNECT_NOTIFICATION_EVENT.EXTERNAL_ACTION_EMAIL;
        const copilotPortalUrl = config.get('copilotPortalUrl');
        const slackEmail = config.has('copilotsSlackEmail') ?
          config.get('copilotsSlackEmail') : config.copilotsSlackEmail;

        req.log.info('Sending emails to all copilots about new opportunity', {
          opportunityId: opportunity.id,
          subjectsCount: subjects.length,
          batchSize: EMAIL_BATCH_SIZE,
          concurrency: EMAIL_CONCURRENCY,
          hasSlackEmail: Boolean(slackEmail),
        });

        const sendNotification = async (userName, recipient) => {
          if (PER_RECIPIENT_DEBUG) {
            req.log.debug('Dispatching email event', { opportunityId: opportunity.id, recipient, userName });
          }
          await createEvent(emailEventType, {
            data: {
              user_name: userName,
              opportunity_details_url: `${copilotPortalUrl}/opportunity/${opportunity.id}`,
              work_manager_url: config.get('workManagerUrl'),
              opportunity_type: getCopilotTypeLabel(type),
              opportunity_title: opportunityTitle,
              start_date: moment(startDate).format('DD-MM-YYYY'),
            },
            sendgrid_template_id: TEMPLATE_IDS.CREATE_REQUEST,
            recipients: [recipient],
            version: 'v3',
          }, req.log);
        };

        // subjects.forEach(subject => sendNotification(subject.handle, subject.email));

        const recipients = subjects
          .filter(s => s && s.email)
          .map(s => ({ userName: s.handle, recipient: s.email }));

        if (slackEmail) {
          recipients.push({ userName: 'Copilots', recipient: slackEmail });
        }

        // Batch + concurrency limit
        const total = recipients.length;
        const startedAt = Date.now();

        for (let offset = 0; offset < total; offset += EMAIL_BATCH_SIZE) {
          const batch = recipients.slice(offset, offset + EMAIL_BATCH_SIZE);
          const batchNo = Math.floor(offset / EMAIL_BATCH_SIZE) + 1;
          const batchCount = Math.ceil(total / EMAIL_BATCH_SIZE);
          const t0 = Date.now();

          req.log.info('Sending email batch', {
            opportunityId: opportunity.id,
            batch: batchNo,
            of: batchCount,
            batchSize: batch.length,
            processedBefore: offset,
            total,
            sample: batch.slice(0, 3).map(r => ({ userName: r.userName, recipient: r.recipient })),
          });

          // eslint-disable-next-line no-await-in-loop
          await Promise.map(
            batch,
            r => sendNotification(r.userName, r.recipient),
            { concurrency: EMAIL_CONCURRENCY },
          );

          req.log.info('Finished email batch', {
            opportunityId: opportunity.id,
            batch: batchNo,
            of: batchCount,
            processedNow: Math.min(offset + batch.length, total),
            total,
            batchMs: Date.now() - t0,
            totalMsSoFar: Date.now() - startedAt,
          });
        }

        req.log.info('Finished sending emails to copilots', {
          opportunityId: opportunity.id,
          totalRecipients: total,
          totalMs: Date.now() - startedAt,
        });
      } catch (emailErr) {
        req.log.error('Error sending notifications', {
          opportunityId: opportunity.id,
          message: emailErr && emailErr.message,
          stack: emailErr && emailErr.stack,
        });
      }

      return opportunity;
    } catch (err) {
      req.log.error('approveRequest failed', { error: err });
      throw err; // let outer transaction handle rollback
    }
  });
};
