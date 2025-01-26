module.exports = function defineCopilotRequest(sequelize, DataTypes) {
  const CopliotRequest = sequelize.define('CopilotRequest', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    status: { type: DataTypes.STRING, defaultValue: 'new' },
    data: { type: DataTypes.JSON, defaultValue: {} },

    createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    createdBy: { type: DataTypes.INTEGER, allowNull: false },
    updatedBy: { type: DataTypes.INTEGER, allowNull: false },
  }, {
    tableName: 'copilot_requests',
    paranoid: true,
    timestamps: true,
    updatedAt: 'updatedAt',
    createdAt: 'createdAt',
    indexes: [],
  });

  CopliotRequest.associate = (models) => {
    CopliotRequest.hasMany(models.Project, { as: 'projects', foreignKey: 'projectId' });
  };

  
  return CopliotRequest;
};
