import _ from 'lodash';
import moment from 'moment';
import models from '../models';
import { STATUS_HISTORY_REFERENCES } from '../constants';
/* eslint-disable valid-jsdoc */

/**
 * Populate and map milestone model with statusHistory
 * NOTE that this function mutates milestone
 *
 * @param {Array|Object} milestone one milestone or list of milestones
 * @param {Object}       options   options which has been used to call main method
 *
 * @returns {Promise} promise
 */
const populateWithStatusHistory = async (milestone, options) => {
  // depend on this option `milestone` is a sequlize ORM object or plain JS object
  const isRaw = !!_.get(options, 'raw');
  const getMilestoneId = m => (
    isRaw ? m.id : m.dataValues.id
  );
  const formatMilestone = statusHistory => (
    isRaw ? { statusHistory } : { dataValues: { statusHistory } }
  );
  if (Array.isArray(milestone)) {
    const allStatusHistory = await models.StatusHistory.findAll({
      where: {
        referenceId: { $in: milestone.map(getMilestoneId) },
        reference: 'milestone',
      },
      order: [['createdAt', 'desc']],
      raw: true,
    });

    return milestone.map((m, index) => {
      const statusHistory = _.filter(allStatusHistory, { referenceId: getMilestoneId(m) });
      return _.merge(milestone[index], formatMilestone(statusHistory));
    });
  }

  const statusHistory = await models.StatusHistory.findAll({
    where: {
      referenceId: getMilestoneId(milestone),
      reference: 'milestone',
    },
    order: [['createdAt', 'desc']],
    raw: true,
  });
  return _.merge(milestone, formatMilestone(statusHistory));
};

/**
 * The Milestone model
 */
module.exports = (sequelize, DataTypes) => {
  const Milestone = sequelize.define('Milestone', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING(255), allowNull: false },
    description: DataTypes.STRING(255),
    duration: { type: DataTypes.INTEGER, allowNull: false },
    startDate: { type: DataTypes.DATE, allowNull: false },
    actualStartDate: DataTypes.DATE,
    endDate: DataTypes.DATE,
    completionDate: DataTypes.DATE,
    status: { type: DataTypes.STRING(45), allowNull: false },
    type: { type: DataTypes.STRING(45), allowNull: false },
    details: DataTypes.JSON,
    order: { type: DataTypes.INTEGER, allowNull: false },
    plannedText: { type: DataTypes.STRING(512) },
    activeText: { type: DataTypes.STRING(512) },
    completedText: { type: DataTypes.STRING(512) },
    blockedText: { type: DataTypes.STRING(512) },
    hidden: { type: DataTypes.BOOLEAN, defaultValue: false },
    deletedAt: DataTypes.DATE,
    createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    deletedBy: DataTypes.BIGINT,
    createdBy: { type: DataTypes.BIGINT, allowNull: false },
    updatedBy: { type: DataTypes.BIGINT, allowNull: false },
  }, {
    tableName: 'milestones',
    paranoid: true,
    timestamps: true,
    updatedAt: 'updatedAt',
    createdAt: 'createdAt',
    deletedAt: 'deletedAt',
    hooks: {
      afterCreate: (milestone, options) => models.StatusHistory.create({
        reference: STATUS_HISTORY_REFERENCES.MILESTONE,
        referenceId: milestone.id,
        status: milestone.status,
        comment: null,
        createdBy: milestone.createdBy,
        updatedBy: milestone.updatedBy,
      }, {
        transaction: options.transaction,
      }).then(() => populateWithStatusHistory(milestone, options)),

      afterBulkCreate: (milestones, options) => {
        const listStatusHistory = milestones.map(({ dataValues }) => ({
          reference: STATUS_HISTORY_REFERENCES.MILESTONE,
          referenceId: dataValues.id,
          status: dataValues.status,
          comment: null,
          createdBy: dataValues.createdBy,
          updatedBy: dataValues.updatedBy,
        }));

        return models.StatusHistory.bulkCreate(listStatusHistory, {
          transaction: options.transaction,
        }).then(() => populateWithStatusHistory(milestones, options));
      },

      afterUpdate: (milestone, options) => {
        if (milestone.changed().includes('status')) {
          return models.StatusHistory.create({
            reference: STATUS_HISTORY_REFERENCES.MILESTONE,
            referenceId: milestone.id,
            status: milestone.status,
            comment: options.comment || null,
            createdBy: milestone.createdBy,
            updatedBy: milestone.updatedBy,
          }, {
            transaction: options.transaction,
          }).then(() => populateWithStatusHistory(milestone));
        }
        return populateWithStatusHistory(milestone, options);
      },

      afterFind: (milestone, options) => {
        if (!milestone) return Promise.resolve();
        return populateWithStatusHistory(milestone, options);
      },
    },
  });

  /**
   * Get total duration of the given timeline by summing up individual milestone durations
   * @param timelineId the id of timeline
   */
  Milestone.getTimelineDuration = (timelineId) => {
    const where = { timelineId, hidden: false };
    return Milestone.findAll({
      where,
      order: [['order', 'asc']],
      attributes: ['id', 'duration', 'startDate', 'endDate', 'actualStartDate', 'completionDate'],
      raw: true,
    })
      .then((milestones) => {
        let scheduledDuration = 0;
        let completedDuration = 0;
        let duration = 0;
        let progress = 0;
        if (milestones) {
          const fMilestone = milestones[0];
          const lMilestone = milestones[milestones.length - 1];
          const startDate = fMilestone.actualStartDate ? fMilestone.actualStartDate : fMilestone.startDate;
          const endDate = lMilestone.completionDate ? lMilestone.completionDate : lMilestone.endDate;
          duration = moment.utc(endDate).diff(moment.utc(startDate), 'days') + 1;
          milestones.forEach((m) => {
            if (m.completionDate !== null) {
              let mDuration = 0;
              if (m.actualStartDate !== null) {
                mDuration = moment.utc(m.completionDate).diff(moment.utc(m.actualStartDate), 'days') + 1;
              } else {
                mDuration = moment.utc(m.completionDate).diff(moment.utc(m.startDate), 'days') + 1;
              }
              scheduledDuration += mDuration;
              completedDuration += mDuration;
            } else {
              scheduledDuration += m.duration;
            }
          });
          if (scheduledDuration > 0) {
            progress = Math.round((completedDuration / scheduledDuration) * 100);
          }
        }
        return Promise.resolve({ duration, progress });
      });
  };

  return Milestone;
};
