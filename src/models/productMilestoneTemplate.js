/* eslint-disable valid-jsdoc */

/**
 * The Product Milestone Template model
 */
module.exports = (sequelize, DataTypes) => {
  const ProductMilestoneTemplate = sequelize.define('ProductMilestoneTemplate', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING(255), allowNull: false },
    description: DataTypes.STRING(255),
    duration: { type: DataTypes.INTEGER, allowNull: false },
    type: { type: DataTypes.STRING(45), allowNull: false },
    order: { type: DataTypes.INTEGER, allowNull: false },
    plannedText: { type: DataTypes.STRING(512), allowNull: false },
    activeText: { type: DataTypes.STRING(512), allowNull: false },
    completedText: { type: DataTypes.STRING(512), allowNull: false },
    blockedText: { type: DataTypes.STRING(512), allowNull: false },
    hidden: { type: DataTypes.BOOLEAN, defaultValue: false },
    deletedAt: DataTypes.DATE,
    createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    deletedBy: DataTypes.BIGINT,
    createdBy: { type: DataTypes.BIGINT, allowNull: false },
    updatedBy: { type: DataTypes.BIGINT, allowNull: false },
  }, {
    tableName: 'product_milestone_templates',
    paranoid: true,
    timestamps: true,
    updatedAt: 'updatedAt',
    createdAt: 'createdAt',
    deletedAt: 'deletedAt',
  });

  return ProductMilestoneTemplate;
};
