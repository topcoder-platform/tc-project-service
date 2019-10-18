import _ from 'lodash';

module.exports = function defineProjectPhase(sequelize, DataTypes) {
  const ProjectPhase = sequelize.define('ProjectPhase', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING, allowNull: true },
    description: { type: DataTypes.STRING, allowNull: true },
    requirements: { type: DataTypes.STRING, allowNull: true },
    status: { type: DataTypes.STRING, allowNull: true },
    startDate: { type: DataTypes.DATE, allowNull: true },
    endDate: { type: DataTypes.DATE, allowNull: true },
    duration: { type: DataTypes.INTEGER, allowNull: true },
    budget: { type: DataTypes.DOUBLE, defaultValue: 0.0 },
    spentBudget: { type: DataTypes.DOUBLE, defaultValue: 0.0 },
    progress: { type: DataTypes.DOUBLE, defaultValue: 0.0 },
    details: { type: DataTypes.JSON, defaultValue: {} },
    order: { type: DataTypes.INTEGER, allowNull: true },

    deletedAt: { type: DataTypes.DATE, allowNull: true },
    createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    deletedBy: { type: DataTypes.INTEGER, allowNull: true },
    createdBy: { type: DataTypes.INTEGER, allowNull: false },
    updatedBy: { type: DataTypes.INTEGER, allowNull: false },
  }, {
    tableName: 'project_phases',
    paranoid: true,
    timestamps: true,
    updatedAt: 'updatedAt',
    createdAt: 'createdAt',
    deletedAt: 'deletedAt',
    indexes: [],
  });

  ProjectPhase.getActiveProjectPhases = projectId => ProjectPhase.findAll({
    where: {
      deletedAt: { $eq: null },
      projectId,
    },
    raw: true,
  });

  ProjectPhase.associate = (models) => {
    ProjectPhase.hasMany(models.PhaseProduct, { as: 'products', foreignKey: 'phaseId' });
    ProjectPhase.belongsToMany(models.WorkStream, { through: models.PhaseWorkStream, foreignKey: 'phaseId' });
  };

  /**
   * Search project phases
   * @param {Object} parameters the parameters
   *          - sortField: the field that will be references when sorting
   *          - sortType: ASC or DESC
   *          - fields: the fields to retrieved
   *          - projectId: the id of project
   * @param {Object} log the request log
   * @return {Object} the result rows and count
   */
  ProjectPhase.search = async (parameters = {}, log) => {
    // ordering
    const orderBy = [];
    if (_.has(parameters, 'sortField') && _.has(parameters, 'sortType')) {
      orderBy.push([parameters.sortField, parameters.sortType]);
    }
    // find options
    const options = {
      where: {
        projectId: parameters.projectId,
      },
      order: orderBy,
      logging: (str) => { log.debug(str); },
    };
    // select fields
    if (_.has(parameters, 'fields')) {
      _.set(options, 'attributes', parameters.fields.filter(e => e !== 'products'));
      if (parameters.fields.includes('products')) {
        _.set(options, 'include', [{ model: this.sequelize.models.PhaseProduct, as: 'products' }]);
      }
    }

    return ProjectPhase.findAll(options).then(phases => ({ rows: phases, count: phases.length }));
  };

  return ProjectPhase;
};
