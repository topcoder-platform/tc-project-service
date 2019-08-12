/* eslint-disable valid-jsdoc */

/**
 * The Building block model
 */
module.exports = (sequelize, DataTypes) => {
  const BuildingBlock = sequelize.define('BuildingBlock', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    key: { type: DataTypes.STRING(255), allowNull: false, unique: true },
    config: { type: DataTypes.JSON, allowNull: false, defaultValue: {} },
    privateConfig: { type: DataTypes.JSON, allowNull: false, defaultValue: {} },
    deletedAt: DataTypes.DATE,
    createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    deletedBy: DataTypes.BIGINT,
    createdBy: { type: DataTypes.BIGINT, allowNull: false },
    updatedBy: { type: DataTypes.BIGINT, allowNull: false },
  }, {
    tableName: 'building_blocks',
    paranoid: true,
    timestamps: true,
    updatedAt: 'updatedAt',
    createdAt: 'createdAt',
    deletedAt: 'deletedAt',
    hooks: {
      beforeFind: (options) => {
        if (!options.includePrivateConfigForInternalUsage) {
          // try to remove privateConfig from attributes
          const idx = options.attributes.indexOf('privateConfig');
          if (idx >= 0) {
            options.attributes.splice(idx, 1);
          }
        }
      },
    },
  });

  return BuildingBlock;
};
