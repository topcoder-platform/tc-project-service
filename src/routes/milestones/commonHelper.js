/**
 * Common functionality for milestone endpoints
 */
import _ from 'lodash';
import moment from 'moment';
import config from 'config';
import models from '../../models';
import { MILESTONE_STATUS, ADMIN_ROLES } from '../../constants';
import util from '../../util';

const validStatuses = JSON.parse(config.get('VALID_STATUSES_BEFORE_PAUSED'));

/**
 * Create new milestone
 * @param {Object} authUser The current user
 * @param {Object} timeline The timeline of milestone
 * @param {Object} data The updated data
 * @param {Object} transaction The transaction to use
 * @returns {Object} The updated milestone
 * @throws {Error} If something went wrong
 */
async function createMilestone(authUser, timeline, data, transaction) {
  // eslint-disable-next-line
  const userId = authUser.userId;
  const entity = Object.assign({}, data, { createdBy: userId, updatedBy: userId, timelineId: timeline.id });
  if (entity.startDate < timeline.startDate) {
    const apiErr = new Error('Milestone startDate must not be before the timeline startDate');
    apiErr.status = 400;
    throw apiErr;
  }
  // Circumvent postgresql duplicate key error, see https://stackoverflow.com/questions/50834623/sequelizejs-error-duplicate-key-value-violates-unique-constraint-message-pkey
  await models.sequelize.query('SELECT setval(\'milestones_id_seq\', (SELECT MAX(id) FROM "milestones"))',
    { raw: true, transaction });
  const result = await models.Milestone.create(entity, { transaction });
  return _.omit(result.toJSON(), ['deletedBy', 'deletedAt']);
}

/**
 * Delete single milestone
 * @param {Object} authUser The current user
 * @param {String|Number} timelineId The timeline id of milestone
 * @param {String|Number} id The milestone id
 * @param {Object} transaction The transaction to use
 * @param {Object} [item] The milestone to delete
 * @returns {Object} Object with id field for milestone id
 * @throws {Error} If something went wrong
 */
async function deleteMilestone(authUser, timelineId, id, transaction, item) {
  const where = { id, timelineId };
  const milestone = item || await models.Milestone.findOne({ where }, { transaction });
  if (!milestone) {
    const apiErr = new Error(`Milestone not found for milestone id ${id}`);
    apiErr.status = 404;
    throw apiErr;
  }
  await milestone.update({ deletedBy: authUser.userId }, { transaction });
  await milestone.destroy({ transaction });
  return { id };
}

/**
 * Update single milestone
 * @param {Object} authUser The current user
 * @param {String|Number} timelineId The timeline id of milestone
 * @param {Object} data The updated data
 * @param {Object} transaction The transaction to use
 * @param {Object} [item] The item to update
 * @returns {{updated: Object, original: Object}} The updated and original milestones
 * @throws {Error} If something went wrong
 */
async function updateMilestone(authUser, timelineId, data, transaction, item) {
  const id = data.id;
  const where = {
    timelineId,
    id,
  };
  const entityToUpdate = Object.assign({}, data, {
    updatedBy: authUser.userId,
    timelineId,
  });

  delete entityToUpdate.id;

  const milestone = item || await models.Milestone.findOne({ where }, { transaction });
  if (!milestone) {
    const apiErr = new Error(`Milestone not found for milestone id ${id}`);
    apiErr.status = 404;
    throw apiErr;
  }

  const original = milestone.toJSON();

  if (entityToUpdate.status === MILESTONE_STATUS.PAUSED && !validStatuses.includes(milestone.status)) {
    const validStatutesStr = validStatuses.join(', ');
    const apiErr = new Error(`Milestone can only be paused from the next statuses: ${validStatutesStr}`);
    apiErr.status = 400;
    throw apiErr;
  }
  if (entityToUpdate.status === 'resume') {
    if (milestone.status !== MILESTONE_STATUS.PAUSED) {
      const apiErr = new Error('Milestone status isn\'t paused');
      apiErr.status = 400;
      throw apiErr;
    }
    const statusHistory = await models.StatusHistory.findAll({
      where: { referenceId: id },
      order: [['createdAt', 'desc'], ['id', 'desc']],
      attributes: ['status', 'id'],
      limit: 2,
      raw: true,
    }, { transaction });
    if (statusHistory.length !== 2) {
      const apiErr = new Error('No previous status is found');
      apiErr.status = 500;
      throw apiErr;
    }
    entityToUpdate.status = statusHistory[1].status;
  }

  // only admins can update values of 'completionDate' and 'actualStartDate' if they are already set
  const isUpdatedCompletionDate = milestone.completionDate && entityToUpdate.completionDate
    && !moment(milestone.completionDate).isSame(entityToUpdate.completionDate);
  const isUpdatedActualStartDate = milestone.actualStartDate && entityToUpdate.actualStartDate
    && !moment(milestone.actualStartDate).isSame(entityToUpdate.actualStartDate);


  if (
    (isUpdatedCompletionDate || isUpdatedActualStartDate)
    && !util.hasPermission({ topcoderRoles: ADMIN_ROLES }, authUser)
  ) {
    const apiErr = new Error('You are not allowed to perform this action.');
    apiErr.status = 403;
    throw apiErr;
  }

  if (
    entityToUpdate.completionDate &&
      (entityToUpdate.actualStartDate || milestone.actualStartDate) &&
      moment.utc(entityToUpdate.completionDate).isBefore(
        moment.utc(entityToUpdate.actualStartDate || milestone.actualStartDate),
        'day',
      )
  ) {
    const apiErr = new Error('The milestone completionDate should be greater or equal to actualStartDate.');
    apiErr.status = 400;
    throw apiErr;
  }
  // Comment this code for now and disable respective unit tests
  // Most likely it has to be removed from the server, as otherwise client-side cannot properly
  // control bulk updates of several milestones, as some milestones could be automatically updated by this logic
  // which would lead to the unexpected results client-side.
  /*
  const durationChanged = {}.hasOwnProperty.call(entityToUpdate, 'duration') &&
        entityToUpdate.duration !== milestone.duration;
  const statusChanged = {}.hasOwnProperty.call(entityToUpdate, 'status') &&
        entityToUpdate.status !== milestone.status;
  const completionDateChanged = {}.hasOwnProperty.call(entityToUpdate, 'completionDate') &&
        !_.isEqual(milestone.completionDate, entityToUpdate.completionDate);
  const today = moment
    .utc()
    .hours(0)
    .minutes(0)
    .seconds(0)
    .milliseconds(0);

  entityToUpdate.details = util.mergeJsonObjects(milestone.details, entityToUpdate.details);
  let actualStartDateChanged = false;
  if (statusChanged) {
    switch (entityToUpdate.status) {
      case MILESTONE_STATUS.COMPLETED:
        entityToUpdate.completionDate = entityToUpdate.completionDate || today;
        entityToUpdate.duration = moment.utc(entityToUpdate.completionDate)
          .diff(entityToUpdate.actualStartDate, 'days') + 1;
        break;
      case MILESTONE_STATUS.ACTIVE:
        entityToUpdate.actualStartDate = today;
        actualStartDateChanged = true;
        break;
      default:
    }
  }
  // Updates the end date of the milestone if:
  // 1. if duration of the milestone is udpated, update its end date
  // OR
  // 2. if actual start date is updated, updating the end date of the activated milestone because
  // early or late start of milestone, we are essentially changing the end schedule of the milestone
  if (durationChanged || actualStartDateChanged) {
    const updatedStartDate = actualStartDateChanged ? entityToUpdate.actualStartDate : milestone.startDate;
    const updatedDuration = _.get(entityToUpdate, 'duration', milestone.duration);
    entityToUpdate.endDate = moment.utc(updatedStartDate).add(updatedDuration - 1, 'days').toDate();
  }

  // if completionDate has changed
  if (!statusChanged && completionDateChanged) {
    entityToUpdate.duration = moment.utc(entityToUpdate.completionDate)
      .diff(entityToUpdate.actualStartDate, 'days') + 1;
    entityToUpdate.status = MILESTONE_STATUS.COMPLETED;
  }
  */

  const result = await milestone.update(entityToUpdate, { comment: entityToUpdate.statusComment, transaction });
  return {
    original: _.omit(original, ['deletedBy', 'deletedAt']),
    updated: _.omit(result.toJSON(), ['deletedBy', 'deletedAt']),
  };
}


module.exports = {
  createMilestone,
  deleteMilestone,
  updateMilestone,
};
