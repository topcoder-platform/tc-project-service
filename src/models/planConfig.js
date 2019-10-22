/* eslint-disable valid-jsdoc */

/**
 * The PlanConfig model
 */

import versionModelClassMethods from './versionModelClassMethods';

module.exports = (sequelize, DataTypes) => {
  const PlanConfig = sequelize.define('PlanConfig', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    key: { type: DataTypes.STRING(45), allowNull: false },
    version: { type: DataTypes.BIGINT, allowNull: false, defaultValue: 1 },
    revision: { type: DataTypes.BIGINT, allowNull: false, defaultValue: 1 },
    config: { type: DataTypes.JSON, allowNull: false },

    deletedAt: { type: DataTypes.DATE, allowNull: true },
    createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    deletedBy: { type: DataTypes.INTEGER, allowNull: true },
    createdBy: { type: DataTypes.INTEGER, allowNull: false },
    updatedBy: { type: DataTypes.INTEGER, allowNull: false },
  }, {
    tableName: 'plan_config',
    paranoid: true,
    timestamps: true,
    updatedAt: 'updatedAt',
    createdAt: 'createdAt',
    deletedAt: 'deletedAt',
    indexes: [
      {
        unique: true,
        fields: ['key', 'version', 'revision'],
      },
    ],
  });

  const classMethods = versionModelClassMethods(PlanConfig, 'config');
  PlanConfig.deleteOldestRevision = classMethods.deleteOldestRevision;
  PlanConfig.newVersionNumber = classMethods.newVersionNumber;
  PlanConfig.createNewVersion = classMethods.createNewVersion;
  PlanConfig.latestVersion = classMethods.latestVersion;
  PlanConfig.latestRevisionOfLatestVersion = classMethods.latestRevisionOfLatestVersion;
  PlanConfig.latestVersionIncludeUsed = classMethods.latestVersionIncludeUsed;
  PlanConfig.findOneWithLatestRevision = classMethods.findOneWithLatestRevision;

  return PlanConfig;
};
