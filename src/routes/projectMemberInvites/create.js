

import validate from 'express-validation';
import _ from 'lodash';
import Joi from 'joi';
import config from 'config';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import models from '../../models';
import util from '../../util';
import {
  PROJECT_MEMBER_ROLE,
  INVITE_STATUS,
  EVENT,
  RESOURCES,
  MAX_PARALLEL_REQUEST_QTY,
  CONNECT_NOTIFICATION_EVENT,
} from '../../constants';
import { createEvent } from '../../services/busApi';
import { PERMISSION, PROJECT_TO_TOPCODER_ROLES_MATRIX } from '../../permissions/constants';

const ALLOWED_FIELDS = _.keys(models.ProjectMemberInvite.rawAttributes).concat(['handle']);

/**
 * API to create member invite to project.
 *
 */
const permissions = tcMiddleware.permissions;

const addMemberValidations = {
  body: Joi.object().keys({
    handles: Joi.array().items(Joi.string()).optional().min(1),
    emails: Joi.array().items(Joi.string().email()).optional().min(1),
    role: Joi.any().valid(_.values(PROJECT_MEMBER_ROLE)).required(),
  }).required(),
  query: {
    fields: Joi.string().optional(),
  },
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
 * Get user handle by user id from user list. Used to generate error messages below.
 * You need to make sure user with specific userId exists in users.
 * @param {Number} userId user id
 * @param {Array} users user list
 * @returns {String} user handle
 */
const getUserHandleById = (userId, users) => _.find(users, { userId }).handle;

/**
 * Helper method to build promises for creating new invites in DB
 *
 * @param {Object} req     express request object
 * @param {Array} inviteEmails  invite.emails
 * @param {Array} inviteUserIds filtered invite.userIds
 * @param {Array}  invites existent invites from DB
 * @param {Object} data    template for new invites to be put in DB
 * @param {Array}  failed  failed invites error message
 * @param {Array} members  already members of the project
 * @param {Array} inviteUsers users retrieved by invite.handles
 * @returns {Promise<Promise[]>} list of promises
 */
const buildCreateInvitePromises = (req, inviteEmails, inviteUserIds, invites, data, failed, members, inviteUsers) => {
  const invitePromises = [];
  if (inviteUserIds) {
    // remove invites for users that are invited already
    const errMessageForAlreadyInvitedUsers = 'User with such handle is already invited to this project.';
    _.remove(inviteUserIds, u => _.some(invites, (i) => {
      const isPresent = i.userId === u;
      if (isPresent) {
        failed.push(_.assign({}, {
          handle: getUserHandleById(u, inviteUsers),
          message: errMessageForAlreadyInvitedUsers,
        }));
      }
      return isPresent;
    }));
    inviteUserIds.forEach((userId) => {
      const dataNew = _.clone(data);

      dataNew.userId = userId;

      invitePromises.push(models.ProjectMemberInvite.create(dataNew));
    });
  }

  if (inviteEmails) {
    // if for some emails there are already existent users, we will invite them by userId,
    // to avoid sending them registration email
    return util.lookupMultipleUserEmails(req, inviteEmails, MAX_PARALLEL_REQUEST_QTY)
      // we have to filter emails returned by the Identity Service so we only invite the users
      // whom we are inviting, because Identity Service could possibly (maybe) return
      // users with emails whom we didn't search for
      .then(foundUsers => foundUsers.filter(foundUser => _.includes(inviteEmails, foundUser.email)))
      .then((existentUsers) => {
        // existent user we will invite by userId and email
        const existentUsersWithNumberId = existentUsers.map((user) => {
          const userWithNumberId = _.clone(user);

          userWithNumberId.id = parseInt(user.id, 10);

          return userWithNumberId;
        });
        // non-existent users we will invite them by email only
        const nonExistentUserEmails = inviteEmails.filter(inviteEmail =>
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
        _.forEach(inviteEmails, email => failed.push(_.assign({}, { email, message: error.statusText })));
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
    util.getMemberDetailsByUserIds([req.authUser.userId], req.log, req.id),
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
    // let us request user fields during creating, probably this should be move to GET by ID endpoint instead
    const fields = req.query.fields ? req.query.fields.split(',') : null;

    try {
      util.validateFields(fields, ALLOWED_FIELDS);
    } catch (validationError) {
      const err = new Error(`"fields" is not valid: ${validationError.message}`);
      err.status = 400;
      return next(err);
    }

    if (!invite.handles && !invite.emails) {
      const err = new Error('Either handles or emails are required');
      err.status = 400;
      return next(err);
    }

    if (
      ( // if cannot invite non-customer user
        invite.role !== PROJECT_MEMBER_ROLE.CUSTOMER &&
        !util.hasPermissionByReq(PERMISSION.CREATE_PROJECT_INVITE_TOPCODER, req)
      ) && !(
        // and if cannot invite copilot directly
        invite.role === PROJECT_MEMBER_ROLE.COPILOT &&
        util.hasPermissionByReq(PERMISSION.CREATE_PROJECT_INVITE_COPILOT, req)
      )
    ) {
      const err = new Error(`You are not allowed to invite user as ${invite.role}.`);
      err.status = 403;
      return next(err);
    }

    // get member details by handles first
    return util.getMemberDetailsByHandles(invite.handles, req.log, req.id)
    // we have to filter users returned by the Member Service so we only invite the users
    // whom we are inviting, because Member Service has a loose search logic and may return
    // users with handles whom we didn't search for
      .then(foundUsers => foundUsers.filter(foundUser => _.includes(invite.handles, foundUser.handle)))
      .then((inviteUsers) => {
        const members = req.context.currentProjectMembers;
        const projectId = _.parseInt(req.params.projectId);
        // check user handle exists in returned result
        const errorMessageHandleNotExist = 'User with such handle does not exist';
        if (!!invite.handles && invite.handles.length > 0) {
          const existentHandles = _.map(inviteUsers, 'handle');
          failed = _.concat(failed, _.map(_.difference(invite.handles, existentHandles), handle => _.assign({}, {
            handle,
            message: errorMessageHandleNotExist,
          })));
        }

        let inviteUserIds = _.map(inviteUsers, 'userId');
        const promises = [];
        const errorMessageForAlreadyMemberUser = 'User with such handle is already a member of the team.';

        if (inviteUserIds) {
        // remove members already in the team
          _.remove(inviteUserIds, u => _.some(members, (m) => {
            const isPresent = m.userId === u;
            if (isPresent) {
              failed.push(_.assign({}, {
                handle: getUserHandleById(m.userId, inviteUsers),
                message: errorMessageForAlreadyMemberUser,
              }));
            }
            return isPresent;
          }));

          // for each user invited by `handle` (userId) we have to load they Topcoder Roles,
          // so we can check if such a user can be invited with desired Project Role
          // for customers we don't check it to avoid extra call, as any Topcoder user can be invited as customer
          if (invite.role !== PROJECT_MEMBER_ROLE.CUSTOMER) {
            _.forEach(inviteUserIds, (userId) => {
              req.log.info(userId);
              promises.push(util.getUserRoles(userId, req.log, req.id));
            });
          }
        }

        if (invite.emails) {
        // email invites can only be used for CUSTOMER role
          if (invite.role !== PROJECT_MEMBER_ROLE.CUSTOMER) { // eslint-disable-line no-lonely-if
            const message = `Emails can only be used for ${PROJECT_MEMBER_ROLE.CUSTOMER}`;
            failed = _.concat(failed, _.map(invite.emails, email => _.assign({}, { email, message })));
            delete invite.emails;
          }
        }
        if (promises.length === 0) {
          promises.push(Promise.resolve());
        }
        return Promise.all(promises).then((rolesList) => {
          if (inviteUserIds && invite.role !== PROJECT_MEMBER_ROLE.CUSTOMER) {
            req.log.debug('Checking if users are allowed to be invited with desired Project Role.');
            const forbidUserList = [];
            _.zip(inviteUserIds, rolesList).forEach((data) => {
              const [userId, roles] = data;

              if (roles) {
                req.log.debug(`Got user (id: ${userId}) Topcoder roles: ${roles.join(', ')}.`);

                if (!util.hasPermission({ topcoderRoles: PROJECT_TO_TOPCODER_ROLES_MATRIX[invite.role] }, { roles })) {
                  forbidUserList.push(userId);
                }
              } else {
                req.log.debug(`Didn't get any Topcoder roles for user (id: ${userId}).`);
                forbidUserList.push(userId);
              }
            });
            if (forbidUserList.length > 0) {
              const message = `cannot be invited with a "${invite.role}" role to the project`;
              failed = _.concat(failed, _.map(forbidUserList,
                id => _.assign({}, { handle: getUserHandleById(id, inviteUsers), message })));
              req.log.debug(`Users with id(s) ${forbidUserList.join(', ')} ${message}`);
              inviteUserIds = _.filter(inviteUserIds, userId => !_.includes(forbidUserList, userId));
            }
          }
          return models.ProjectMemberInvite.getPendingInvitesForProject(projectId)
            .then((invites) => {
              const data = {
                projectId,
                role: invite.role,
                // invite copilots directly if user has permissions
                status: (invite.role !== PROJECT_MEMBER_ROLE.COPILOT ||
                util.hasPermissionByReq(PERMISSION.CREATE_PROJECT_INVITE_COPILOT, req))
                  ? INVITE_STATUS.PENDING
                  : INVITE_STATUS.REQUESTED,
                createdBy: req.authUser.userId,
                updatedBy: req.authUser.userId,
              };
              req.log.debug('Creating invites');
              return models.Sequelize.Promise.all(buildCreateInvitePromises(
                req, invite.emails, inviteUserIds, invites, data, failed, members, inviteUsers))
                .then((values) => {
                  values.forEach((v) => {
                    // emit the event
                    util.sendResourceToKafkaBus(
                      req,
                      EVENT.ROUTING_KEY.PROJECT_MEMBER_INVITE_CREATED,
                      RESOURCES.PROJECT_MEMBER_INVITE,
                      v.toJSON());

                    // send email invite (async)
                    if (v.email && !v.userId && v.status === INVITE_STATUS.PENDING) {
                      sendInviteEmail(req, projectId, v);
                    }
                  });
                  return values.map(value => value.get({ plain: true }));
                }); // models.sequelize.Promise.all
            }); // models.ProjectMemberInvite.getPendingInvitesForProject
        })
          .then(values => (
          // populate successful invites with user details if required
            util.getObjectsWithMemberDetails(values, fields, req)
              .catch((err) => {
                req.log.error('Cannot get user details for invites.');
                req.log.debug('Error during getting user details for invites', err);
                // continues without details anyway
                return values;
              })
          ))
          .then((values) => {
            const response = _.assign({}, { success: util.postProcessInvites('$[*]', values, req) });
            if (failed.length) {
              res.status(403).json(_.assign({}, response, { failed }));
            } else {
              res.status(201).json(response);
            }
          });
      }).catch(err => next(err));
  },
];
