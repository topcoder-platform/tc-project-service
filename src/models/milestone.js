import moment from 'moment';
/* eslint-disable valid-jsdoc */

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
    plannedText: { type: DataTypes.STRING(512), allowNull: false },
    activeText: { type: DataTypes.STRING(512), allowNull: false },
    completedText: { type: DataTypes.STRING(512), allowNull: false },
    blockedText: { type: DataTypes.STRING(512), allowNull: false },
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
    classMethods: {
      /**
       * Get total duration of the given timeline by summing up individual milestone durations
       * @param timelineId the id of timeline
       */
      getTimelineDuration(timelineId) {
        console.log('getTimelineDuration');
        const where = { timelineId, hidden: false };
        return this.findAll({
          where,
          attributes: ['id', 'duration', 'startDate', 'actualStartDate', 'completionDate'],
          raw: true,
        })
        .then((milestones) => {
          let scheduledDuration = 0;
          let completedDuration = 0;
          if (milestones) {
            milestones.forEach((m) => {
              if (m.completionDate) {
                if (m.actualStartDate) {
                  scheduledDuration += moment.utc(m.completionDate).diff(moment.utc(m.actualStartDate), 'days') + 1;
                  completedDuration += scheduledDuration;
                } else {
                  scheduledDuration += moment.utc(m.completionDate).diff(moment.utc(m.startDate), 'days') + 1;
                  completedDuration += scheduledDuration;
                }
              } else {
                scheduledDuration += m.duration;
              }
            });
          }
          return Promise.resolve({ scheduledDuration, completedDuration });
        });
      },
    },
  });

  return Milestone;
};
