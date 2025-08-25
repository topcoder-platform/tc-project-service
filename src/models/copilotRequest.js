import _ from 'lodash';
import { COPILOT_REQUEST_STATUS } from '../constants';

module.exports = function defineCopilotRequest(sequelize, DataTypes) {
  const CopilotRequest = sequelize.define('CopilotRequest', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    status: {
      type: DataTypes.STRING(16),
      defaultValue: 'new',
      allowNull: false,
      validate: {
        isIn: [_.values(COPILOT_REQUEST_STATUS)],
      },
    },
    data: { type: DataTypes.JSON, defaultValue: {}, allowNull: false },

    deletedAt: { type: DataTypes.DATE, allowNull: true },
    createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    deletedBy: { type: DataTypes.INTEGER, allowNull: true },
    createdBy: { type: DataTypes.INTEGER, allowNull: false },
    updatedBy: { type: DataTypes.INTEGER, allowNull: false },
  }, {
    tableName: 'copilot_requests',
    paranoid: true,
    timestamps: true,
    updatedAt: 'updatedAt',
    createdAt: 'createdAt',
    deletedAt: 'deletedAt',
    indexes: [],
  });

  CopilotRequest.associate = (models) => {
    CopilotRequest.hasMany(models.CopilotOpportunity, { as: 'copilotOpportunity', foreignKey: 'copilotRequestId' });
    CopilotRequest.belongsTo(models.Project, { as: 'project', foreignKey: 'projectId' });
  };

  return CopilotRequest;
};
