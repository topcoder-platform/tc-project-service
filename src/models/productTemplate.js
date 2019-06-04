/* eslint-disable valid-jsdoc */

/**
 * The Product Template model
 */
module.exports = (sequelize, DataTypes) => {
  const ProductTemplate = sequelize.define('ProductTemplate', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING(255), allowNull: false },
    productKey: { type: DataTypes.STRING(45), allowNull: false },
    category: { type: DataTypes.STRING(45), allowNull: false },
    subCategory: { type: DataTypes.STRING(45), allowNull: false },
    icon: { type: DataTypes.STRING(255), allowNull: false },
    brief: { type: DataTypes.STRING(45), allowNull: false },
    details: { type: DataTypes.STRING(255), allowNull: false },
    aliases: { type: DataTypes.JSON, allowNull: false },
    template: { type: DataTypes.JSON, allowNull: true },
    form: { type: DataTypes.JSON, allowNull: true },
    deletedAt: DataTypes.DATE,
    disabled: { type: DataTypes.BOOLEAN, defaultValue: false },
    hidden: { type: DataTypes.BOOLEAN, defaultValue: false },
    isAddOn: { type: DataTypes.BOOLEAN, defaultValue: false },
    createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    deletedBy: DataTypes.BIGINT,
    createdBy: { type: DataTypes.BIGINT, allowNull: false },
    updatedBy: { type: DataTypes.BIGINT, allowNull: false },
  }, {
    tableName: 'product_templates',
    paranoid: true,
    timestamps: true,
    updatedAt: 'updatedAt',
    createdAt: 'createdAt',
    deletedAt: 'deletedAt',
  });

  return ProductTemplate;
};
