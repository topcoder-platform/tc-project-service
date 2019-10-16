/* eslint-disable valid-jsdoc */
/**
 * BuildingBlock model
 *
 * WARNING: This model contains sensitive data!
 *
 * - To return data from this model to the user always use methods `find`/`findAll` which would
 *   filter out the sensitive data which should be never returned to the user.
 * - For internal usage you can use `options.includePrivateConfigForInternalUsage`
 *   which would force `find`/`findAll` to return fields which contain sensitive data.
 *   Use the data returned in such way ONLY FOR INTERNAL usage. It means such data can be used
 *   to make some calculations inside Project Service but it should be never returned to the user as it is.
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
      /**
       * Inside before hook we are evaluating if user has permission to retrieve `privateConfig` field.
       * If no, we remove this field from the attributes list, so this field is not requested and thus
       * not returned.
       *
       * @param {Object}   options  find/findAll options
       */
      afterFind: function removePrivateConfig(buildingBlocks, options) {
        // ONLY FOR INTERNAL USAGE: don't use this option to return the data by API
        if (!options.includePrivateConfigForInternalUsage) {
          // try to remove privateConfig from result
          buildingBlocks.map((block) => {
            const b = block;
            delete b.privateConfig;
            return b;
          });
        }
        return buildingBlocks;
      },
    },
  });

  return BuildingBlock;
};
