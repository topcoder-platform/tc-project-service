/* eslint-disable valid-jsdoc */

/**
 * The Project Template model
 */
module.exports = (sequelize, DataTypes) => {
  const ProjectTemplate = sequelize.define('ProjectTemplate', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING(255), allowNull: false },
    key: { type: DataTypes.STRING(45), allowNull: false },
    category: { type: DataTypes.STRING(45), allowNull: false },
    scope: { type: DataTypes.JSON, allowNull: false },
    phases: { type: DataTypes.JSON, allowNull: false },
    deletedAt: DataTypes.DATE,
    createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    deletedBy: DataTypes.BIGINT,
    createdBy: { type: DataTypes.BIGINT, allowNull: false },
    updatedBy: { type: DataTypes.BIGINT, allowNull: false },
  }, {
    tableName: 'project_templates',
    paranoid: true,
    timestamps: true,
    updatedAt: 'updatedAt',
    createdAt: 'createdAt',
    deletedAt: 'deletedAt',
  });

  return ProjectTemplate;
};
