module.exports = function defineProjectPhaseApproval(sequelize, DataTypes) {
  const ProjectPhaseApproval = sequelize.define('ProjectPhaseApproval', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    phaseId: { type: DataTypes.BIGINT, allowNull: false },
    decision: { type: DataTypes.ENUM, values: ['approve', 'reject'], allowNull: false },
    comment: { type: DataTypes.STRING, allowNull: true },
    startDate: { type: DataTypes.DATE, allowNull: false },
    endDate: { type: DataTypes.DATE, allowNull: true },
    expectedEndDate: { type: DataTypes.DATE, allowNull: false },
    deletedAt: { type: DataTypes.DATE, allowNull: true },
    createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    deletedBy: { type: DataTypes.INTEGER, allowNull: true },
    createdBy: { type: DataTypes.INTEGER, allowNull: false },
    updatedBy: { type: DataTypes.INTEGER, allowNull: false },
  },
  {
    tableName: 'project_phase_approval',
    paranoid: true,
    timestamps: true,
    updatedAt: 'updatedAt',
    createdAt: 'createdAt',
    deletedAt: 'deletedAt',
    defaultScope: {
      attributes: {
        exclude: ['deletedAt', 'deletedBy'],
      },
    },
    hooks: {
      afterCreate: (projectPhaseApproval) => {
        // eslint-disable-next-line no-param-reassign
        delete projectPhaseApproval.dataValues.deletedAt;
        // eslint-disable-next-line no-param-reassign
        delete projectPhaseApproval.dataValues.deletedBy;
      },
    },
  });

  ProjectPhaseApproval.getPhaseApprovals = (phaseId, raw = true) => ProjectPhaseApproval.findAll({
    where: {
      phaseId,
    },
    raw,
  });

  ProjectPhaseApproval.associate = (models) => {
    ProjectPhaseApproval.belongsTo(models.ProjectPhase, { foreignKey: { name: 'phaseId', allowNull: false } });
  };
  return ProjectPhaseApproval;
};
