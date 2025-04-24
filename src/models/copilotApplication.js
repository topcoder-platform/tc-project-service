import _ from 'lodash';
import { COPILOT_OPPORTUNITY_STATUS, COPILOT_OPPORTUNITY_TYPE } from '../constants';

module.exports = function defineCopilotOpportunity(sequelize, DataTypes) {
  const CopilotApplication = sequelize.define('CopilotApplication', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    opportunityId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: 'copilot_opportunities',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    userId: { type: DataTypes.BIGINT, allowNull: false },
    deletedAt: { type: DataTypes.DATE, allowNull: true },
    createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    deletedBy: { type: DataTypes.INTEGER, allowNull: true },
    createdBy: { type: DataTypes.INTEGER, allowNull: false },
    updatedBy: { type: DataTypes.INTEGER, allowNull: false },
  }, {
    tableName: 'copilot_applications',
    paranoid: true,
    timestamps: true,
    updatedAt: 'updatedAt',
    createdAt: 'createdAt',
    deletedAt: 'deletedAt',
    indexes: [],
  });

  CopilotApplication.associate = (models) => {
    CopilotApplication.belongsTo(models.CopilotOpportunity, { as: 'copilotOpportunity', foreignKey: 'opportunityId' });
  };

  return CopilotApplication;
};
