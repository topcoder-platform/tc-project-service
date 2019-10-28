

import validate from 'express-validation';
import _ from 'lodash';
import Joi from 'joi';
import config from 'config';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import models from '../../models';
import util from '../../util';
import { PROJECT_MEMBER_ROLE, PROJECT_MEMBER_MANAGER_ROLES,
  MANAGER_ROLES, INVITE_STATUS, EVENT, RESOURCES, USER_ROLE,
  MAX_PARALLEL_REQUEST_QTY, CONNECT_NOTIFICATION_EVENT } from '../../constants';
import { createEvent } from '../../services/busApi';

/**
 * API to create member invite to project.
 *
 */
const permissions = tcMiddleware.permissions;

const addMemberValidations = {
  body: Joi.object().keys({
    userIds: Joi.array().items(Joi.number()).optional().min(1),
    emails: Joi.array().items(Joi.string().email()).optional().min(1),
    role: Joi.any().valid(_.values(PROJECT_MEMBER_ROLE)).required(),
  }).required(),
};

/**
 * Helper method to check the uniqueness of two emails
 *
 * @param {String} email1    first email to compare
 * @param {String} email2    second email to compare
 * @param {Object} options  the options
 *
 * @returns {Boolean} true if two emails are same
 */
const compareEmail = (email1, email2, options = { UNIQUE_GMAIL_VALIDATION: false }) => {
  if (options.UNIQUE_GMAIL_VALIDATION) {
    // email is gmail
    const emailSplit = /(^[\w.+-]+)(@gmail\.com|@googlemail\.com)$/g.exec(_.toLower(email1));
    if (emailSplit) {
      const address = emailSplit[1].replace('.', '');
      const emailDomain = emailSplit[2].replace('.', '\\.');
      const regexAddress = address.split('').join('\\.?');
      const regex = new RegExp(`${regexAddress}${emailDomain}`);
      return regex.test(_.toLower(email2));
    }
  }
  return _.toLower(email1) === _.toLower(email2);
};

/**
 * Helper method to build promises for creating new invites in DB
 *
 * @param {Object} req     express request object
 * @param {Object} invite  invite to process
 * @param {Array}  invites existent invites from DB
 * @param {Object} data    template for new invites to be put in DB
 * @param {Array}  failed  failed invites error message
 * @param {Array} members  already members of the project
 *
 * @returns {Promise<Promise[]>} list of promises
 */
const buildCreateInvitePromises = (req, invite, invites, data, failed, members) => {
  const invitePromises = [];
  if (invite.userIds) {
    // remove invites for users that are invited already
    const errMessageForAlreadyInvitedUsers = 'User with such handle is already invited to this project.';
    _.remove(invite.userIds, u => _.some(invites, (i) => {
      const isPresent = i.userId === u;
      if (isPresent) {
        failed.push(_.assign({}, {
          userId: u,
          message: errMessageForAlreadyInvitedUsers,
        }));
      }
      return isPresent;
    }));
    invite.userIds.forEach((userId) => {
      const dataNew = _.clone(data);

      dataNew.userId = userId;

      invitePromises.push(models.ProjectMemberInvite.create(dataNew));
    });
  }

  if (invite.emails) {
    // if for some emails there are already existent users, we will invite them by userId,
    // to avoid sending them registration email
    return util.lookupMultipleUserEmails(req, invite.emails, MAX_PARALLEL_REQUEST_QTY)
      .then((existentUsers) => {
        // existent user we will invite by userId and email
        const existentUsersWithNumberId = existentUsers.map((user) => {
          const userWithNumberId = _.clone(user);

          userWithNumberId.id = parseInt(user.id, 10);

          return userWithNumberId;
        });
        // non-existent users we will invite them by email only
        const nonExistentUserEmails = invite.emails.filter(inviteEmail =>
          !_.find(existentUsers, existentUser =>
            compareEmail(existentUser.email, inviteEmail, { UNIQUE_GMAIL_VALIDATION: false })),
        );

        // remove users that are already member of the team
        const errMessageForAlreadyMemberUsers = 'User with such email is already a member of the team.';

        _.remove(existentUsersWithNumberId, user => _.some(members, (m) => {
          const isPresent = (m.userId === user.id);
          if (isPresent) {
            failed.push(_.assign({}, {
              email: user.email,
              message: errMessageForAlreadyMemberUsers,
            }));
          }
          return isPresent;
        }));

        // remove invites for users that are invited already
        const errMessageForAlreadyInvitedUsers = 'User with such email is already invited to this project.';

        _.remove(existentUsersWithNumberId, user => _.some(invites, (i) => {
          const isPresent = (i.userId === user.id);
          if (isPresent) {
            failed.push(_.assign({}, {
              email: i.email,
              message: errMessageForAlreadyInvitedUsers,
            }));
          }
          return isPresent;
        }));

        existentUsersWithNumberId.forEach((user) => {
          const dataNew = _.clone(data);

          dataNew.userId = user.id;
          dataNew.email = user.email ? user.email.toLowerCase() : user.email;

          invitePromises.push(models.ProjectMemberInvite.create(dataNew));
        });
        // remove invites for users that are invited already
        _.remove(nonExistentUserEmails, email =>
          _.some(invites, (i) => {
            const areEmailsSame = compareEmail(i.email, email, {
              UNIQUE_GMAIL_VALIDATION: config.get('UNIQUE_GMAIL_VALIDATION'),
            });
            if (areEmailsSame) {
              failed.push(_.assign({}, {
                email: i.email,
                message: errMessageForAlreadyInvitedUsers,
              }));
            }
            return areEmailsSame;
          }),
        );
        nonExistentUserEmails.forEach((email) => {
          const dataNew = _.clone(data);

          dataNew.email = email.toLowerCase();

          invitePromises.push(models.ProjectMemberInvite.create(dataNew));
        });
        return invitePromises;
      }).catch((error) => {
        req.log.error(error);
        _.forEach(invite.emails, email => failed.push(_.assign({}, { email, message: error.statusText })));
        return invitePromises;
      });
  }
  return invitePromises;
};

const sendInviteEmail = (req, projectId, invite) => {
  req.log.debug(req.authUser);
  const emailEventType = CONNECT_NOTIFICATION_EVENT.PROJECT_MEMBER_EMAIL_INVITE_CREATED;
  const promises = [
    models.Project.findOne({
      where: { id: projectId },
      raw: true,
    }),
    util.getMemberDetailsByUserIds([`userId:${req.authUser.userId}`], req.log, req.id),
  ];
  return Promise.all(promises).then((responses) => {
    req.log.debug(responses);
    const project = responses[0];
    const initiator = responses[1] && responses[1].length ? responses[1][0] : {
      userId: req.authUser.userId,
      firstName: 'Connect',
      lastName: 'User',
    };
    createEvent(emailEventType, {
      data: {
        connectURL: config.get('connectUrl'),
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
      recipients: [invite.email],
      version: 'v3',
      from: {
        name: config.get('EMAIL_INVITE_FROM_NAME'),
        email: config.get('EMAIL_INVITE_FROM_EMAIL'),
      },
      categories: [`${process.env.NODE_ENV}:${emailEventType}`.toLowerCase()],
    }, req.log);
  }).catch((error) => {
    req.log.error(error);
  });
};

module.exports = [
  // handles request validations
  validate(addMemberValidations),
  permissions('projectMemberInvite.create'),
  (req, res, next) => {
    let failed = [];
    const invite = req.body;

    if (!invite.userIds && !invite.emails) {
      const err = new Error('Either userIds or emails are required');
      err.status = 400;
      return next(err);
    }

    if (!util.hasRoles(req, MANAGER_ROLES) && invite.role !== PROJECT_MEMBER_ROLE.CUSTOMER) {
      const err = new Error(`You are not allowed to invite user as ${invite.role}`);
      err.status = 403;
      return next(err);
    }

    const members = req.context.currentProjectMembers;
    const projectId = _.parseInt(req.params.projectId);

    const promises = [];
    const errorMessageForAlreadyMemberUser = 'User with such handle is already a member of the team.';
    if (invite.userIds) {
      // remove members already in the team
      _.remove(invite.userIds, u => _.some(members, (m) => {
        const isPresent = m.userId === u;
        if (isPresent) {
          failed.push(_.assign({}, {
            userId: m.userId,
            message: errorMessageForAlreadyMemberUser,
          }));
        }
        return isPresent;
      }));
        // permission:
        // user has to have constants.MANAGER_ROLES role
        // to be invited as PROJECT_MEMBER_ROLE.MANAGER
      if (_.includes(PROJECT_MEMBER_MANAGER_ROLES, invite.role)) {
        _.forEach(invite.userIds, (userId) => {
          req.log.info(userId);
          promises.push(util.getUserRoles(userId, req.log, req.id));
        });
      }
    }

    if (invite.emails) {
        // email invites can only be used for CUSTOMER role
      if (invite.role !== PROJECT_MEMBER_ROLE.CUSTOMER) {  // eslint-disable-line no-lonely-if
        const message = `Emails can only be used for ${PROJECT_MEMBER_ROLE.CUSTOMER}`;
        failed = _.concat(failed, _.map(invite.emails, email => _.assign({}, { email, message })));
        delete invite.emails;
      }
    }
    if (promises.length === 0) {
      promises.push(Promise.resolve());
    }
    return Promise.all(promises).then((rolesList) => {
      if (!!invite.userIds && _.includes(PROJECT_MEMBER_MANAGER_ROLES, invite.role)) {
        req.log.debug('Checking if userId is allowed as manager');
        const forbidUserList = [];
        _.zip(invite.userIds, rolesList).forEach((data) => {
          const [userId, roles] = data;
          req.log.debug(roles);

          if (roles && !util.hasIntersection(MANAGER_ROLES, roles)) {
            forbidUserList.push(userId);
          }
        });
        if (forbidUserList.length > 0) {
          const message = 'cannot be added with a Manager role to the project';
          failed = _.concat(failed, _.map(forbidUserList, id => _.assign({}, { userId: id, message })));
          invite.userIds = _.filter(invite.userIds, userId => !_.includes(forbidUserList, userId));
        }
      }
      return models.ProjectMemberInvite.getPendingInvitesForProject(projectId)
        .then((invites) => {
          const data = {
            projectId,
            role: invite.role,
            // invite directly if user is admin or copilot manager
            status: (invite.role !== PROJECT_MEMBER_ROLE.COPILOT ||
                    util.hasRoles(req, [USER_ROLE.CONNECT_ADMIN, USER_ROLE.COPILOT_MANAGER]))
                      ? INVITE_STATUS.PENDING
                      : INVITE_STATUS.REQUESTED,
            createdBy: req.authUser.userId,
            updatedBy: req.authUser.userId,
          };

          req.log.debug('Creating invites');
          return models.Sequelize.Promise.all(buildCreateInvitePromises(req, invite, invites, data, failed, members))
            .then((values) => {
              values.forEach((v) => {
                // emit the event
                util.sendResourceToKafkaBus(
                  req,
                  EVENT.ROUTING_KEY.PROJECT_MEMBER_INVITE_CREATED,
                  RESOURCES.PROJECT_MEMBER_INVITE,
                  v.toJSON());

                req.app.services.pubsub.publish(
                        EVENT.ROUTING_KEY.PROJECT_MEMBER_INVITE_CREATED,
                        v,
                        { correlationId: req.id },
                    );
                // send email invite (async)
                if (v.email && !v.userId && v.status === INVITE_STATUS.PENDING) {
                  sendInviteEmail(req, projectId, v);
                }
              });
              return values;
            }); // models.sequelize.Promise.all
        }); // models.ProjectMemberInvite.getPendingInvitesForProject
    })
    .then((values) => {
      const success = _.assign({}, { success: values });
      if (failed.length) {
        res.status(403).json(_.assign({}, success, { failed }));
      } else {
        res.status(201).json(success);
      }
    })
    .catch(err => next(err));
  },
];
