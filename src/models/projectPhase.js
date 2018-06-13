/* eslint-disable valid-jsdoc */

import _ from 'lodash';

module.exports = function defineProjectPhase(sequelize, DataTypes) {
  const ProjectPhase = sequelize.define('ProjectPhase', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING, allowNull: true },
    status: { type: DataTypes.STRING, allowNull: true },
    startDate: { type: DataTypes.DATE, allowNull: true },
    endDate: { type: DataTypes.DATE, allowNull: true },
    duration: { type: DataTypes.INTEGER, allowNull: false },
    budget: { type: DataTypes.DOUBLE, defaultValue: 0.0 },
    spentBudget: { type: DataTypes.DOUBLE, defaultValue: 0.0 },
    progress: { type: DataTypes.DOUBLE, defaultValue: 0.0 },
    details: { type: DataTypes.JSON, defaultValue: {} },

    deletedAt: { type: DataTypes.DATE, allowNull: true },
    createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    deletedBy: { type: DataTypes.INTEGER, allowNull: true },
    createdBy: { type: DataTypes.INTEGER, allowNull: false },
    updatedBy: { type: DataTypes.INTEGER, allowNull: false },
  }, {
    tableName: 'project_phases',
    paranoid: false,
    timestamps: true,
    updatedAt: 'updatedAt',
    createdAt: 'createdAt',
    deletedAt: 'deletedAt',
    indexes: [],
    classMethods: {
      getActiveProjectPhases(projectId) {
        return this.findAll({
          where: {
            deletedAt: { $eq: null },
            projectId,
          },
          raw: true,
        });
      },
      associate: (models) => {
        ProjectPhase.hasMany(models.PhaseProduct, { as: 'products', foreignKey: 'phaseId' });
      },
      /**
       * Search name or status
       * @param parameters the parameters
       *          - filters: the filters contains keyword
       *          - order: the order
       *          - limit: the limit
       *          - offset: the offset
       *          - attributes: the attributes to get
       * @param log the request log
       * @return the result rows and count
       */
      searchText(parameters, log) {
        // special handling for keyword filter
        let query = '1=1 ';
        if (_.has(parameters.filters, 'id')) {
          if (_.isObject(parameters.filters.id)) {
            if (parameters.filters.id.$in.length === 0) {
              parameters.filters.id.$in.push(-1);
            }
            query += `AND id IN (${parameters.filters.id.$in}) `;
          } else if (_.isString(parameters.filters.id) || _.isNumber(parameters.filters.id)) {
            query += `AND id = ${parameters.filters.id} `;
          }
        }
        if (_.has(parameters.filters, 'status')) {
          const statusFilter = parameters.filters.status;
          if (_.isObject(statusFilter)) {
            const statuses = statusFilter.$in.join("','");
            query += `AND status IN ('${statuses}') `;
          } else if (_.isString(statusFilter)) {
            query += `AND status ='${statusFilter}'`;
          }
        }
        if (_.has(parameters.filters, 'name')) {
          query += `AND name like '%${parameters.filters.name}%' `;
        }

        const attributesStr = `"${parameters.attributes.join('","')}"`;
        const orderStr = `"${parameters.order[0][0]}" ${parameters.order[0][1]}`;

        // select count of project_phases
        return sequelize.query(`SELECT COUNT(1) FROM project_phases WHERE ${query}`,
          { type: sequelize.QueryTypes.SELECT,
            logging: (str) => { log.debug(str); },
            raw: true,
          })
          .then((fcount) => {
            const count = fcount[0].count;
            // select project attributes
            return sequelize.query(`SELECT ${attributesStr} FROM project_phases WHERE ${query} ORDER BY ` +
              ` ${orderStr} LIMIT ${parameters.limit} OFFSET ${parameters.offset}`,
              { type: sequelize.QueryTypes.SELECT,
                logging: (str) => { log.debug(str); },
                raw: true,
              })
              .then(phases => ({ rows: phases, count }));
          });
      },
    },
  });

  return ProjectPhase;
};
