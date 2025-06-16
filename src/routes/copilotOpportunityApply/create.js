import _ from 'lodash';
import validate from 'express-validation';
import Joi from 'joi';
import config from 'config';

import models from '../../models';
import util from '../../util';
import { PERMISSION } from '../../permissions/constants';
import { CONNECT_NOTIFICATION_EVENT, COPILOT_OPPORTUNITY_STATUS, TEMPLATE_IDS, USER_ROLE } from '../../constants';
import { createEvent } from '../../services/busApi';

const applyCopilotRequestValidations = {
  body: Joi.object().keys({
    notes: Joi.string().optional(),
  }),
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
          const pmRole = await util.getRolesByRoleName(USER_ROLE.PROJECT_MANAGER, req.log, req.id);
          const { subjects = [] } = await util.getRoleInfo(pmRole[0], req.log, req.id);

          req.log.debug(subjects, 'all manager subjects');

          const creator = await util.getMemberDetailsByUserIds([opportunity.createdBy], req.log, req.id);
          req.log.debug(creator, 'creator', opportunity.createdBy);

          const listOfSubjects = subjects;
          if (creator && creator[0] && creator[0].email) {
            const isCreatorPartofSubjects = subjects.find(item => {
              if (!item.email) {
                return false;
              }

              return item.email.toLowerCase() === creator[0].email.toLowerCase();
            });
            req.log.debug(isCreatorPartofSubjects, 'isCreatorPartofSubjects');
            if (!isCreatorPartofSubjects) {
              listOfSubjects.push({
                email: creator[0].email,
                handle: creator[0].handle,
              });
            }
          }

          req.log.debug(listOfSubjects, 'final list of subjects');
          
          const emailEventType = CONNECT_NOTIFICATION_EVENT.EXTERNAL_ACTION_EMAIL;
          const copilotPortalUrl = config.get('copilotPortalUrl');
          listOfSubjects.forEach((subject) => {
            createEvent(emailEventType, {
                data: {
                  user_name: subject.handle,
                  opportunity_details_url: `${copilotPortalUrl}/opportunity/${opportunity.id}#applications`,
                  work_manager_url: config.get('workManagerUrl'),
                },
                sendgrid_template_id: TEMPLATE_IDS.APPLY_COPILOT,
                recipients: [subject.email],
                version: 'v3',
              }, req.log);
          });

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
