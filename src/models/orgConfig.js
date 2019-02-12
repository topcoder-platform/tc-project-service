/* eslint-disable valid-jsdoc */

/**
 * The Organization config model
 */
module.exports = (sequelize, DataTypes) => {
  const OrgConfig = sequelize.define('OrgConfig', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    orgId: { type: DataTypes.STRING(45), allowNull: false },
    configName: { type: DataTypes.STRING(45), allowNull: false },
    configValue: { type: DataTypes.STRING(512) },
    deletedAt: DataTypes.DATE,
    createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    deletedBy: DataTypes.BIGINT,
    createdBy: { type: DataTypes.BIGINT, allowNull: false },
    updatedBy: { type: DataTypes.BIGINT, allowNull: false },
  }, {
    tableName: 'org_config',
    paranoid: true,
    timestamps: true,
    updatedAt: 'updatedAt',
    createdAt: 'createdAt',
    deletedAt: 'deletedAt',
  });

  return OrgConfig;
};
