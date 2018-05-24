

module.exports = function definePhaseProduct(sequelize, DataTypes) {
  const PhaseProduct = sequelize.define('PhaseProduct', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING, allowNull: true },
    projectId: DataTypes.BIGINT,
    directProjectId: DataTypes.BIGINT,
    billingAccountId: DataTypes.BIGINT,
    // TODO: associate this with product_template
    templateId: { type: DataTypes.BIGINT, defaultValue: 0 },
    type: { type: DataTypes.STRING, allowNull: true },
    estimatedPrice: { type: DataTypes.DOUBLE, defaultValue: 0.0 },
    actualPrice: { type: DataTypes.DOUBLE, defaultValue: 0.0 },
    details: { type: DataTypes.JSON, defaultValue: {} },

    deletedAt: { type: DataTypes.DATE, allowNull: true },
    createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    deletedBy: { type: DataTypes.INTEGER, allowNull: true },
    createdBy: { type: DataTypes.INTEGER, allowNull: false },
    updatedBy: { type: DataTypes.INTEGER, allowNull: false },
  }, {
    tableName: 'phase_products',
    paranoid: false,
    timestamps: true,
    updatedAt: 'updatedAt',
    createdAt: 'createdAt',
    deletedAt: 'deletedAt',
    indexes: [],
    classMethods: {
      getActivePhaseProducts(phaseId) {
        return this.findAll({
          where: {
            deletedAt: { $eq: null },
            phaseId,
          },
          raw: true,
        });
      },
    },
  });

  return PhaseProduct;
};
