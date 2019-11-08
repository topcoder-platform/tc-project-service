/* eslint-disable valid-jsdoc */

/**
 * The PriceConfig model
 */

import versionModelClassMethods from './versionModelClassMethods';

module.exports = (sequelize, DataTypes) => {
  const PriceConfig = sequelize.define('PriceConfig', {
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
    tableName: 'price_config',
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
  const classMethods = versionModelClassMethods(PriceConfig, 'config');
  PriceConfig.deleteOldestRevision = classMethods.deleteOldestRevision;
  PriceConfig.newVersionNumber = classMethods.newVersionNumber;
  PriceConfig.createNewVersion = classMethods.createNewVersion;
  PriceConfig.latestVersion = classMethods.latestVersion;
  PriceConfig.latestRevisionOfLatestVersion = classMethods.latestRevisionOfLatestVersion;
  PriceConfig.latestVersionIncludeUsed = classMethods.latestVersionIncludeUsed;
  PriceConfig.findOneWithLatestRevision = classMethods.findOneWithLatestRevision;

  return PriceConfig;
};
