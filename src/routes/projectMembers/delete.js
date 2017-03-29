

import _ from 'lodash';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import models from '../../models';
import { EVENT, PROJECT_MEMBER_ROLE } from '../../constants';

/**
 * API to delete a project member.
 *
 */
const permissions = tcMiddleware.permissions;

module.exports = [
  permissions('project.removeMember'),
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
          const err = new Error('Record not found');
          err.status = 404;
          return Promise.reject(err);
        }
        return member.destroy({ logging: console.log });        // eslint-disable-line no-console
      })
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
        // fire event
        const pmember = member.get({ plain: true });
        req.log.debug(pmember);
        req.app.services.pubsub.publish(
          EVENT.ROUTING_KEY.PROJECT_MEMBER_REMOVED,
          pmember,
          { correlationId: req.id },
        );
        req.app.emit(EVENT.ROUTING_KEY.PROJECT_MEMBER_REMOVED, { req, member: pmember });
        res.status(204).json({});
      }).catch(err => next(err));
  },
];
