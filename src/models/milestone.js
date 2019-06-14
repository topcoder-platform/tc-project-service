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
