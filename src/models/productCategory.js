/* eslint-disable valid-jsdoc */

/**
 * The Product Category model
 */
module.exports = function defineProductCategory(sequelize, DataTypes) {
  return sequelize.define('ProductCategory', {
    key: { type: DataTypes.STRING(45), primaryKey: true },
    displayName: { type: DataTypes.STRING(255), allowNull: false },
    icon: { type: DataTypes.STRING(255), allowNull: false },
    question: { type: DataTypes.STRING(255), allowNull: false },
    info: { type: DataTypes.STRING(1024), allowNull: false },
    aliases: { type: DataTypes.JSON, allowNull: false },
    disabled: { type: DataTypes.BOOLEAN, defaultValue: false },
    hidden: { type: DataTypes.BOOLEAN, defaultValue: false },

    deletedAt: { type: DataTypes.DATE, allowNull: true },
    createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    deletedBy: { type: DataTypes.INTEGER, allowNull: true },
    createdBy: { type: DataTypes.INTEGER, allowNull: false },
    updatedBy: { type: DataTypes.INTEGER, allowNull: false },
  }, {
    tableName: 'product_categories',
    paranoid: true,
    timestamps: true,
    updatedAt: 'updatedAt',
    createdAt: 'createdAt',
    deletedAt: 'deletedAt',
  });
};
