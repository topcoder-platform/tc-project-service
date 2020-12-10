module.exports = function defineProjectEstimation(sequelize, DataTypes) {
  const ProjectEstimation = sequelize.define('ProjectEstimation', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    buildingBlockKey: { type: DataTypes.STRING, allowNull: false },
    conditions: { type: DataTypes.STRING, allowNull: false },
    price: { type: DataTypes.DOUBLE, allowNull: false },
    quantity: { type: DataTypes.INTEGER, allowNull: true },
    minTime: { type: DataTypes.INTEGER, allowNull: false },
    maxTime: { type: DataTypes.INTEGER, allowNull: false },
    metadata: { type: DataTypes.JSON, allowNull: false, defaultValue: {} },
    projectId: { type: DataTypes.BIGINT, allowNull: false },

    deletedAt: { type: DataTypes.DATE, allowNull: true },
    createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    deletedBy: DataTypes.BIGINT,
    createdBy: { type: DataTypes.INTEGER, allowNull: false },
    updatedBy: { type: DataTypes.INTEGER, allowNull: false },
  }, {
    tableName: 'project_estimations',
    paranoid: true,
    timestamps: true,
    updatedAt: 'updatedAt',
    createdAt: 'createdAt',
    indexes: [],
  });

  return ProjectEstimation;
};
