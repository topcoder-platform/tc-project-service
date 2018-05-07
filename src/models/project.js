/* eslint-disable valid-jsdoc */

import _ from 'lodash';
import { PROJECT_TYPE, PROJECT_STATUS, PROJECT_MEMBER_ROLE } from '../constants';

module.exports = function defineProject(sequelize, DataTypes) {
  const Project = sequelize.define('Project', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    directProjectId: DataTypes.BIGINT,
    billingAccountId: DataTypes.BIGINT,
    name: { type: DataTypes.STRING, allowNull: false },
    description: DataTypes.TEXT,
    external: DataTypes.JSON,
    bookmarks: DataTypes.JSON,
    utm: { type: DataTypes.JSON, allowNull: true },
    estimatedPrice: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    actualPrice: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    terms: {
      type: DataTypes.ARRAY(DataTypes.INTEGER),
      allowNull: false,
      defaultValue: [],
    },
    type: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: [_.values(PROJECT_TYPE)],
      },
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: [_.values(PROJECT_STATUS)],
      },
    },
    details: { type: DataTypes.JSON },
    challengeEligibility: DataTypes.JSON,
    cancelReason: DataTypes.STRING,
    deletedAt: { type: DataTypes.DATE, allowNull: true },
    createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    createdBy: { type: DataTypes.INTEGER, allowNull: false },
    updatedBy: { type: DataTypes.INTEGER, allowNull: false },
  }, {
    tableName: 'projects',
    timestamps: true,
    updatedAt: 'updatedAt',
    createdAt: 'createdAt',
    deletedAt: 'deletedAt',
    indexes: [
      { fields: ['createdAt'] },
      { fields: ['name'] },
      { fields: ['type'] },
      { fields: ['status'] },
      { fields: ['directProjectId'] },
    ],
    classMethods: {
      /*
       * @Co-pilots should be able to view projects any of the following conditions are met:
       * a. they are registered active project members on the project
       * b. any project that is in 'reviewed' state AND does not yet have a co-pilot assigned
       * @param userId the id of user
       */
      getProjectIdsForCopilot(userId) {
        return this.findAll({
          where: {
            $or: [
              ['EXISTS(SELECT * FROM "project_members" WHERE "deletedAt" ' +
                'IS NULL AND "projectId" = "Project".id AND "userId" = ? )', userId],
              ['"Project".status=? AND NOT EXISTS(SELECT * FROM "project_members" WHERE ' +
                  ' "deletedAt" IS NULL AND "projectId" = "Project".id AND "role" = ? )',
                PROJECT_STATUS.REVIEWED, PROJECT_MEMBER_ROLE.COPILOT],
            ],
          },
          attributes: ['id'],
          raw: true,
        })
        .then(res => _.map(res, 'id'));
      },
      /**
       * Get direct project id
       * @param id the id of project
       */
      getDirectProjectId(id) {
        return this.findById(id, {
          attributes: ['directProjectId'],
          raw: true,
        })
            .then(res => res.directProjectId);
      },
      associate: (models) => {
        Project.hasMany(models.ProjectMember, { as: 'members', foreignKey: 'projectId' });
        Project.hasMany(models.ProjectAttachment, { as: 'attachments', foreignKey: 'projectId' });
      },

      /**
       * Search keyword in name, description, details.utm.code (To be deprecated)
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
        if (_.has(parameters.filters, 'type')) {
          query += `AND type = '${parameters.filters.type}' `;
        }
        if (_.has(parameters.filters, 'keyword')) {
          query += `AND "projectFullText" ~ lower('${parameters.filters.keyword}')`;
        }

        const attributesStr = `"${parameters.attributes.join('","')}"`;
        const orderStr = `"${parameters.order[0][0]}" ${parameters.order[0][1]}`;

        // select count of projects
        return sequelize.query(`SELECT COUNT(1) FROM projects WHERE ${query}`,
          { type: sequelize.QueryTypes.SELECT,
            logging: (str) => { log.debug(str); },
            raw: true,
          })
          .then((fcount) => {
            const count = fcount[0].count;
            // select project attributes
            return sequelize.query(`SELECT ${attributesStr} FROM projects WHERE ${query} ORDER BY ` +
              ` ${orderStr} LIMIT ${parameters.limit} OFFSET ${parameters.offset}`,
              { type: sequelize.QueryTypes.SELECT,
                logging: (str) => { log.debug(str); },
                raw: true,
              })
              .then(projects => ({ rows: projects, count }));
          });
      },
      findProjectRange(startId, endId, fields) {
        return this.findAll({
          where: { id: { $between: [startId, endId] } },
          attributes: _.get(fields, 'projects', null),
          raw: true,
        });
      },
    },
  });

  return Project;
};
