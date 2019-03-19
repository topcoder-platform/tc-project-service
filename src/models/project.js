/* eslint-disable valid-jsdoc */

import _ from 'lodash';
import { PROJECT_STATUS } from '../constants';

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
    templateId: DataTypes.BIGINT,
    deletedAt: { type: DataTypes.DATE, allowNull: true },
    createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    deletedBy: DataTypes.BIGINT,
    createdBy: { type: DataTypes.INTEGER, allowNull: false },
    updatedBy: { type: DataTypes.INTEGER, allowNull: false },
    version: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'v3' },
    lastActivityAt: { type: DataTypes.DATE, allowNull: false },
    // we use string for `lastActivityUserId` because it comes in Kafka messages payloads
    // and can be not only user id but also `coderbot`, `system` or some kind of autopilot bot id in the future
    lastActivityUserId: { type: DataTypes.STRING, allowNull: false },
  }, {
    tableName: 'projects',
    paranoid: true,
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
       * b. any project that is in 'reviewed' state AND copilot is invited
       * @param userId the id of user
       */
      getProjectIdsForCopilot(userId) {
        return this.findAll({
          where: {
            $or: [
              ['EXISTS(SELECT * FROM "project_members" WHERE "deletedAt" ' +
              'IS NULL AND "projectId" = "Project".id AND "userId" = ? )', userId],
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
        Project.hasMany(models.ProjectPhase, { as: 'phases', foreignKey: 'projectId' });
        Project.hasMany(models.ProjectMemberInvite, { as: 'memberInvites', foreignKey: 'projectId' });
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
      findProjectRange(models, startId, endId, fields, raw = true) {
        return this.findAll({
          where: { id: { $between: [startId, endId] } },
          attributes: _.get(fields, 'projects', null),
          raw,
          include: [{
            model: models.ProjectPhase,
            as: 'phases',
            order: [['startDate', 'asc']],
            // where: phasesWhere,
            include: [{
              model: models.PhaseProduct,
              as: 'products',
            }],
          }],
        });
      },
    },
  });

  return Project;
};
