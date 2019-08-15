/* eslint-disable valid-jsdoc */

/**
 * The WorkManagementPermission model
 */
module.exports = (sequelize, DataTypes) => {
  const WorkManagementPermission = sequelize.define('WorkManagementPermission', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    policy: { type: DataTypes.STRING(255), allowNull: false },
    permission: { type: DataTypes.JSON, allowNull: false },
    projectTemplateId: { type: DataTypes.BIGINT, allowNull: false },

    deletedAt: { type: DataTypes.DATE, allowNull: true },
    createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    deletedBy: { type: DataTypes.INTEGER, allowNull: true },
    createdBy: { type: DataTypes.INTEGER, allowNull: false },
    updatedBy: { type: DataTypes.INTEGER, allowNull: false },
  }, {
    tableName: 'work_management_permissions',
    paranoid: true,
    timestamps: true,
    updatedAt: 'updatedAt',
    createdAt: 'createdAt',
    deletedAt: 'deletedAt',
    indexes: [
      {
        unique: true,
        fields: ['policy', 'projectTemplateId'],
      },
    ],
  });

  return WorkManagementPermission;
};
