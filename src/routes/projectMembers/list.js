/**
 * Endpoint to list project members.
 */
import _ from 'lodash';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import util from '../../util';

const permissions = tcMiddleware.permissions;

module.exports = [
  permissions('project.listMembers'),
  async (req, res) => {
    let members = req.context.currentProjectMembers;


    if (members.length && _.get(req, 'query.fields')) {
      const fields = req.query.fields.split(',');

      const ModelFields = [
        'id',
        'userId',
        'role',
        'isPrimary',
        'deletedAt',
        'createdAt',
        'updatedAt',
        'deletedBy',
        'createdBy',
        'updatedBy',
      ];

      const modelFields = _.intersection(ModelFields, fields);
      const hasUserIdField = _.indexOf(fields, 'userId') !== -1;
      if (hasUserIdField === false) {
        modelFields.push('userId');
      }
      // merge model fields
      members = _.map(members, m => _.pick(m, modelFields));

      const MemberDetailFields = ['handle', 'firstName', 'lastName'];
      const memberDetailFields = _.intersection(MemberDetailFields, fields);

      // has handleField
      const hasHandleField = _.indexOf(memberDetailFields, 'handle') !== -1;

      if (hasHandleField === false) {
        memberDetailFields.push('handle');
      }

      if (memberDetailFields.length) {
        const userIds = _.map(members, m => `userId:${m.userId}`) || [];

        const logger = req.log;
        try {
          const memberDetails = await util.getMemberDetailsByUserIds(userIds, logger, req.id);

          // merge detail fields
          _.forEach(members, (m) => {
            const detail = _.find(memberDetails, mt => mt.userId === m.userId);
            if (detail) {
              _.assign(m, _.pick(detail, memberDetailFields));
            }
          });


          const TraitFields = ['photoURL', 'workingHourStart', 'workingHourEnd', 'timeZone'];
          const traitFields = _.intersection(TraitFields, fields);
          if (traitFields.length) {
            const promises = [];
            _.forEach(members, (m) => {
              if (m.handle) {
                promises.push(util.getMemberTratisByHandle(m.handle, req.log, req.id));
              }
            });

            const traits = await Promise.all(promises);

            // remove photoURL, because connect_info also has photoURL
            const ConnectInfoFields = ['workingHourStart', 'workingHourEnd', 'timeZone'];
            const connectInfoFields = _.intersection(ConnectInfoFields, fields);

            // merge traits
            _.forEach(members, (m) => {
              const traitsArr = _.find(traits, t => t[0].userId === m.userId);
              if (traitsArr) {
                if (traitFields[0] === 'photoURL') {
                  _.assign(m, {
                    photoURL: _.get(_.find(traitsArr, { traitId: 'basic_info' }), 'traits.data[0].photoURL'),
                  });
                  if (traitFields.length > 1) {
                    const traitInfo = _.get(_.find(traitsArr, { traitId: 'connect_info' }), 'traits.data[0]', {});
                    _.assign(m, _.pick(traitInfo, connectInfoFields));
                  }
                } else {
                  const traitInfo = _.get(_.find(traitsArr, { traitId: 'connect_info' }), 'traits.data[0]', {});
                  _.assign(m, _.pick(traitInfo, connectInfoFields));
                }
              }
            });
          }
        } catch (e) {
          logger.error('Error getting member details', e);
          if (hasUserIdField === false) {
            members = _.map(members, m => _.omit(m, ['userId']));
          }
          if (hasHandleField === false) {
            members = _.map(members, m => _.omit(m, ['handle']));
          }
          return res.json(util.wrapResponse(req.id, members));
        }
      }

      if (hasUserIdField === false) {
        members = _.map(members, m => _.omit(m, ['userId']));
      }
      if (hasHandleField === false) {
        members = _.map(members, m => _.omit(m, ['handle']));
      }
      return res.json(util.wrapResponse(req.id, members));
    }

    return res.json(util.wrapResponse(req.id, req.context.currentProjectMembers));
  },
];
