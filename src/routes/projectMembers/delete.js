

import _ from 'lodash';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import models from '../../models';
import util from '../../util';
import { EVENT, RESOURCES, PROJECT_MEMBER_ROLE } from '../../constants';
import { PERMISSION } from '../../permissions/constants';

/**
 * API to delete a project member.
 *
 */
const permissions = tcMiddleware.permissions;

module.exports = [
  permissions('projectMember.delete'),
  (req, res, next) => {
    const projectId = _.parseInt(req.params.projectId);
    const memberRecordId = _.parseInt(req.params.id);

    models.sequelize.transaction(() =>
      // soft delete the record
      models.ProjectMember.findOne({
        where: { id: memberRecordId, projectId },
      })
        .then((member) => {
          if (!member) {
            const err = new Error(`Project member not found for member id ${req.params.id}`);
            err.status = 404;
            return Promise.reject(err);
          }

          const isOwnMember = member.userId === req.authUser.userId;

          if (
            !isOwnMember &&
            member.role !== PROJECT_MEMBER_ROLE.CUSTOMER &&
            member.role !== PROJECT_MEMBER_ROLE.COPILOT &&
            !util.hasPermissionByReq(PERMISSION.DELETE_PROJECT_MEMBER_TOPCODER, req)
          ) {
            const err = new Error('You don\'t have permissions to delete other members from Topcoder Team.');
            err.status = 403;
            return Promise.reject(err);
          } else if (
            !isOwnMember &&
            member.role === PROJECT_MEMBER_ROLE.CUSTOMER &&
            !util.hasPermissionByReq(PERMISSION.DELETE_PROJECT_MEMBER_CUSTOMER, req)
          ) {
            const err = new Error('You don\'t have permissions to delete other members with "customer" role.');
            err.status = 403;
            return Promise.reject(err);
          } else if (
            !isOwnMember &&
            member.role === PROJECT_MEMBER_ROLE.COPILOT &&
            !util.hasPermissionByReq(PERMISSION.DELETE_PROJECT_MEMBER_COPILOT, req)
          ) {
            const err = new Error('You don\'t have permissions to delete other members with "copilot" role.');
            err.status = 403;
            return Promise.reject(err);
          }
          return member.update({ deletedBy: req.authUser.userId });
        })
        .then(member => member.destroy({ logging: console.log })) // eslint-disable-line no-console
        .then(member => member.save())
      // if primary co-pilot is removed promote the next co-pilot to primary #43
        .then(member => new Promise((accept, reject) => {
          if (member.role === PROJECT_MEMBER_ROLE.COPILOT && member.isPrimary) {
            // find the next copilot
            models.ProjectMember.findAll({
              limit: 1,
              // return only non-deleted records
              paranoid: true,
              where: {
                projectId,
                role: PROJECT_MEMBER_ROLE.COPILOT,
              },
              order: [['createdAt', 'ASC']],
            }).then((members) => {
              if (members && members.length > 0) {
                // mark the copilot as primary
                const nextMember = members[0];
                nextMember.set({ isPrimary: true });
                nextMember.save().then(() => {
                  accept(member);
                }).catch((err) => {
                  reject(err);
                });
              } else {
                // no copilot found nothing to do
                accept(member);
              }
            }).catch((err) => {
              reject(err);
            });
          } else {
            // nothing to do
            accept(member);
          }
        }))).then((member) => {
      // only return the response after transaction is committed
      const pmember = member.get({ plain: true });
      req.log.debug(pmember);

      // emit the event
      util.sendResourceToKafkaBus(
        req,
        EVENT.ROUTING_KEY.PROJECT_MEMBER_REMOVED,
        RESOURCES.PROJECT_MEMBER,
        pmember);
      res.status(204).json({});
    }).catch(err => next(err));
  },
];
