

module.exports = function defineProjectHistory(sequelize, DataTypes) {
  const ProjectHistory = sequelize.define('ProjectHistory', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    projectId: { type: DataTypes.BIGINT, allowNull: false },
    status: { type: DataTypes.STRING, allowNull: false },
    cancelReason: { type: DataTypes.STRING, allowNull: true },
    createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updatedBy: { type: DataTypes.INTEGER, allowNull: false },
  }, {
    tableName: 'project_history',
    paranoid: false,
    timestamps: true,
    updatedAt: 'updatedAt',
    createdAt: 'createdAt',
    indexes: [],
  });

  return ProjectHistory;
};
