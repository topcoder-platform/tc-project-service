import _ from 'lodash';
import { COPILOT_OPPORTUNITY_STATUS, COPILOT_OPPORTUNITY_TYPE } from '../constants';

module.exports = function defineCopilotOpportunity(sequelize, DataTypes) {
  const CopilotOpportunity = sequelize.define('CopilotOpportunity', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    status: {
      type: DataTypes.STRING(16),
      defaultValue: 'active',
      allowNull: false,
      validate: {
        isIn: [_.values(COPILOT_OPPORTUNITY_STATUS)],
      },
    },
    type: {
      type: DataTypes.STRING(16),
      allowNull: false,
      validate: {
        isIn: [_.values(COPILOT_OPPORTUNITY_TYPE)],
      },
    },
    deletedAt: { type: DataTypes.DATE, allowNull: true },
    createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    deletedBy: { type: DataTypes.INTEGER, allowNull: true },
    createdBy: { type: DataTypes.INTEGER, allowNull: false },
    updatedBy: { type: DataTypes.INTEGER, allowNull: false },
  }, {
    tableName: 'copilot_opportunities',
    paranoid: true,
    timestamps: true,
    updatedAt: 'updatedAt',
    createdAt: 'createdAt',
    deletedAt: 'deletedAt',
    indexes: [],
  });

  CopilotOpportunity.associate = (models) => {
    CopilotOpportunity.belongsTo(models.CopilotRequest, { as: 'copilotRequest' });
  };

  return CopilotOpportunity;
};
