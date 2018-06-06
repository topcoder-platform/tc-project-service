/* eslint-disable valid-jsdoc */

/**
 * The Timeline model
 */
module.exports = (sequelize, DataTypes) => {
  const Timeline = sequelize.define('Timeline', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING(255), allowNull: false },
    description: DataTypes.STRING(255),
    startDate: { type: DataTypes.DATE, allowNull: false },
    endDate: DataTypes.DATE,
    reference: { type: DataTypes.STRING(45), allowNull: false },
    referenceId: { type: DataTypes.BIGINT, allowNull: false },
    deletedAt: DataTypes.DATE,
    createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    deletedBy: DataTypes.BIGINT,
    createdBy: { type: DataTypes.BIGINT, allowNull: false },
    updatedBy: { type: DataTypes.BIGINT, allowNull: false },
  }, {
    tableName: 'timelines',
    paranoid: true,
    timestamps: true,
    updatedAt: 'updatedAt',
    createdAt: 'createdAt',
    deletedAt: 'deletedAt',
    classMethods: {
      associate: (models) => {
        Timeline.hasMany(models.Milestone, { as: 'milestones', foreignKey: 'timelineId', onDelete: 'cascade' });
      },
    },
  });

  return Timeline;
};
