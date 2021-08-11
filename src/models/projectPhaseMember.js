module.exports = function defineProjectPhaseMember(sequelize, DataTypes) {
  const ProjectPhaseMember = sequelize.define('ProjectPhaseMember', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    userId: { type: DataTypes.BIGINT, allowNull: false },

    deletedAt: { type: DataTypes.DATE, allowNull: true },
    createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    deletedBy: { type: DataTypes.INTEGER, allowNull: true },
    createdBy: { type: DataTypes.INTEGER, allowNull: false },
    updatedBy: { type: DataTypes.INTEGER, allowNull: false },
  },
  {
    tableName: 'project_phase_member',
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
      afterCreate: (projectPhaseMember) => {
        // eslint-disable-next-line no-param-reassign
        delete projectPhaseMember.dataValues.deletedAt;
        // eslint-disable-next-line no-param-reassign
        delete projectPhaseMember.dataValues.deletedBy;
      },
    },
    indexes: [
      {
        unique: true,
        fields: ['phaseId', 'userId'],
        where: {
          deletedAt: null,
        },
      },
    ],
  });

  ProjectPhaseMember.getPhaseMembers = (phaseId, raw = true) => ProjectPhaseMember.findAll({
    where: {
      phaseId,
    },
    raw,
  });

  ProjectPhaseMember.getMemberPhases = (userId, raw = true) => ProjectPhaseMember.findAll({
    where: {
      userId,
    },
    raw,
  });

  ProjectPhaseMember.associate = (models) => {
    ProjectPhaseMember.belongsTo(models.ProjectPhase, { foreignKey: 'phaseId' });
  };
  return ProjectPhaseMember;
};
