import _ from 'lodash';

import models from '../../models';
import { COPILOT_REQUEST_STATUS } from '../../constants';
import util from '../../util';

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
                console.log(opportunity);
                const roles = await util.getRolesByRoleName('copilot', req.log, req.id);
                const roleInfo = await util.getRoleInfo(roles[0], req.log, req.id);
                console.log(roles, roleInfo, 'roles by copilot');

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
