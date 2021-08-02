import _ from 'lodash';
import models from '../../models';

/**
 * Update phase members
 * @param {Object} currentUser the user who perform this operation
 * @param {String} projectId the project id
 * @param {String} phaseId the phase id
 * @param {Array<Number>} newPhaseMembers the array of userIds
 * @param {Object} _transaction the sequelize transaction (optional)
 * @returns {Array<Number>} the array of updated phase member objects
 */
async function update(currentUser, projectId, phaseId, newPhaseMembers, _transaction) {
  const createdBy = _.parseInt(currentUser.userId);
  const updatedBy = _.parseInt(currentUser.userId);
  const newMembers = _.uniq(newPhaseMembers);
  let transaction;
  if (_.isUndefined(_transaction)) {
    transaction = await models.sequelize.transaction();
  } else {
    transaction = _transaction;
  }
  try {
    const projectMembers = _.map(await models.ProjectMember.getActiveProjectMembers(projectId), 'userId');
    const notProjectMembers = _.difference(newMembers, projectMembers);
    if (notProjectMembers.length > 0) {
      const err = new Error(`Members with id: ${notProjectMembers} are not members of project ${projectId}`);
      err.status = 400;
      throw (err);
    }
    let phaseMembers = await models.ProjectPhaseMember.getPhaseMembers(phaseId);
    const existentPhaseMembers = _.map(phaseMembers, 'userId');
    const membersToAdd = _.difference(newMembers, existentPhaseMembers);
    const membersToRemove = _.differenceBy(existentPhaseMembers, newMembers);
    if (membersToRemove.length > 0) {
      await models.ProjectPhaseMember.destroy({ where: { phaseId, userId: membersToRemove }, transaction });
      phaseMembers = _.filter(phaseMembers, row => !_.includes(membersToRemove, row.userId));
    }
    if (membersToAdd.length > 0) {
      const createData = _.map(membersToAdd, userId => ({ phaseId, userId, createdBy, updatedBy }));
      const result = await models.ProjectPhaseMember.bulkCreate(createData, { transaction });
      phaseMembers.push(..._.map(result, item => item.toJSON()));
    }
    if (_.isUndefined(_transaction)) {
      await transaction.commit();
    }
    return phaseMembers;
  } catch (err) {
    if (_.isUndefined(_transaction)) {
      await transaction.rollback();
    }
    throw err;
  }
}

export default update;
