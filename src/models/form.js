/* eslint-disable valid-jsdoc */

/**
 * The Form model
 */

import versionModelClassMethods from './versionModelClassMethods';

module.exports = (sequelize, DataTypes) => {
  const Form = sequelize.define('Form', {
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
    tableName: 'form',
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

  const classMethods = versionModelClassMethods(Form, 'config');
  Form.deleteOldestRevision = classMethods.deleteOldestRevision;
  Form.newVersionNumber = classMethods.newVersionNumber;
  Form.createNewVersion = classMethods.createNewVersion;
  Form.latestVersion = classMethods.latestVersion;
  Form.latestRevisionOfLatestVersion = classMethods.latestRevisionOfLatestVersion;
  Form.latestVersionIncludeUsed = classMethods.latestVersionIncludeUsed;
  Form.findOneWithLatestRevision = classMethods.findOneWithLatestRevision;

  return Form;
};
