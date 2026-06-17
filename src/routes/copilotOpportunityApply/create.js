import _ from 'lodash';
import validate from 'express-validation';
import Joi from 'joi';
import config from 'config';

import models from '../../models';
import util from '../../util';
import { PERMISSION } from '../../permissions/constants';
import { CONNECT_NOTIFICATION_EVENT, COPILOT_OPPORTUNITY_STATUS, TEMPLATE_IDS, USER_ROLE } from '../../constants';
import { createEvent } from '../../services/busApi';
import { getCopilotTypeLabel } from '../../utils/copilot';

const applyCopilotRequestValidations = {
  body: Joi.object().keys({
    notes: Joi.string().required(),
  }),
};

/**
 * Adds a notification recipient if the member has an email address and has not already been added.
 *
 * @param {Array} recipients current recipient list for the notification
 * @param {Object} subject member or role subject with email and handle fields
 * @returns {void} updates the recipient list in place
 * @throws {Error} does not throw; invalid subjects are ignored
 */
const addEmailRecipient = (recipients, subject) => {
  if (!subject || !subject.email) {
    return;
  }

  const recipientExists = recipients.find(
    item => item.email.toLowerCase() === subject.email.toLowerCase(),
  );
  if (recipientExists) {
    return;
  }

  recipients.push({
    email: subject.email,
    handle: subject.handle,
  });
};

/**
 * Resolves all PM recipients and the opportunity creator for copilot application notifications.
 *
 * @param {Object} req express request object used for logging and downstream API request ids
 * @param {Object} opportunity copilot opportunity receiving the application
 * @returns {Promise<Array>} unique recipients with email and handle fields
 * @throws {Error} does not throw; lookup failures are logged so application creation is not blocked
 */
const getCopilotApplicationNotificationRecipients = async (req, opportunity) => {
  const recipients = [];

  try {
    const pmRole = await util.getRolesByRoleName(USER_ROLE.PROJECT_MANAGER, req.log, req.id);
    if (pmRole.length > 0) {
      const { subjects = [] } = await util.getRoleInfo(pmRole[0], req.log, req.id);
      subjects.forEach(subject => addEmailRecipient(recipients, subject));
    }
  } catch (err) {
    req.log.error(`Error resolving project manager recipients for copilot application: ${err.message}`);
  }

  try {
    const creator = await util.getMemberDetailsByUserIds([opportunity.createdBy], req.log, req.id);
    addEmailRecipient(recipients, creator && creator[0]);
  } catch (err) {
    req.log.error(`Error resolving opportunity creator recipient for copilot application: ${err.message}`);
  }

  return recipients;
};

/**
 * Sends PM and opportunity creator notifications after a copilot applies to an opportunity.
 *
 * @param {Object} req express request object used for logging and downstream API request ids
 * @param {Object} opportunity copilot opportunity receiving the application
 * @param {Object} application newly created copilot application
 * @returns {Promise<void>} resolves after notification bus events have been submitted
 * @throws {Error} does not throw; notification failures are logged so the application response succeeds
 */
const sendCopilotApplicationNotifications = async (req, opportunity, application) => {
  try {
    const recipients = await getCopilotApplicationNotificationRecipients(req, opportunity);
    if (recipients.length === 0) {
      return;
    }

    let applicant = null;
    try {
      const applicantDetails = await util.getMemberDetailsByUserIds([application.userId], req.log, req.id);
      applicant = applicantDetails && applicantDetails[0];
    } catch (err) {
      req.log.error(`Error resolving copilot applicant for notification payload: ${err.message}`);
    }

    const emailEventType = CONNECT_NOTIFICATION_EVENT.EXTERNAL_ACTION_EMAIL;
    const copilotPortalUrl = config.get('copilotPortalUrl');
    const requestData = opportunity.copilotRequest.data;

    await Promise.all(recipients.map(subject => createEvent(emailEventType, {
      data: {
        user_name: subject.handle,
        opportunity_details_url: `${copilotPortalUrl}/opportunity/${opportunity.id}#applications`,
        work_manager_url: config.get('workManagerUrl'),
        opportunity_type: getCopilotTypeLabel(requestData.projectType),
        opportunity_title: requestData.opportunityTitle,
        copilot_handle: applicant ? applicant.handle : '',
      },
      sendgrid_template_id: TEMPLATE_IDS.APPLY_COPILOT,
      recipients: [subject.email],
      version: 'v3',
    }, req.log)));
  } catch (err) {
    req.log.error(`Error sending copilot application notifications: ${err.message}`);
  }
};

module.exports = [
  validate(applyCopilotRequestValidations),
  async (req, res, next) => {
    const { notes } = req.body;
    const copilotOpportunityId = _.parseInt(req.params.id);
    if (!util.hasPermissionByReq(PERMISSION.APPLY_COPILOT_OPPORTUNITY, req)) {
      const err = new Error('Unable to apply for copilot opportunity');
      _.assign(err, {
        details: JSON.stringify({ message: 'You do not have permission to apply for copilot opportunity' }),
        status: 403,
      });
      return next(err);
    }

    const data = {
      userId: req.authUser.userId,
      createdBy: req.authUser.userId,
      updatedBy: req.authUser.userId,
      opportunityId: copilotOpportunityId,
      notes: notes ? req.sanitize(notes) : null,
    };

    return models.CopilotOpportunity.findOne({
      where: {
        id: copilotOpportunityId,
      },
      include: [
        {
          model: models.CopilotRequest,
          as: 'copilotRequest',
        },
      ],
    }).then(async (opportunity) => {
      if (!opportunity) {
        const err = new Error('No opportunity found');
        err.status = 404;
        return next(err);
      }

      if (opportunity.status !== COPILOT_OPPORTUNITY_STATUS.ACTIVE) {
        const err = new Error('Opportunity is not active');
        err.status = 400;
        return next(err);
      }

      const existingApplication = await models.CopilotApplication.findOne({
        where: {
          opportunityId: opportunity.id,
          userId: req.authUser.userId,
        },
      });

      if (existingApplication) {
        res.status(200).json(existingApplication);
        return Promise.resolve();
      }

      return models.CopilotApplication.create(data)
        .then(async (result) => {
          await sendCopilotApplicationNotifications(req, opportunity, result);
          res.status(201).json(result);
          return Promise.resolve();
        })
        .catch((err) => {
          util.handleError('Error creating copilot application', err, req, next);
          return next(err);
        });
    }).catch((e) => {
      util.handleError('Error applying for copilot opportunity', e, req, next);
    });
  },
];
