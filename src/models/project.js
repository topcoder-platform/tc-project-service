'use strict'
import { PROJECT_TYPE, PROJECT_STATUS, PROJECT_MEMBER_ROLE } from '../constants'
import _ from 'lodash'

module.exports = function(sequelize, DataTypes) {
  var Project = sequelize.define('Project', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    directProjectId: DataTypes.BIGINT,
    billingAccountId: DataTypes.BIGINT,
    name: { type: DataTypes.STRING, allowNull: false },
    description: DataTypes.TEXT,
    external: DataTypes.JSON,
    bookmarks: DataTypes.JSON,
    utm: { type: DataTypes.JSON, allowNull: true },
    estimatedPrice: { type: DataTypes.DECIMAL(10,2), allowNull: true },
    actualPrice: { type: DataTypes.DECIMAL(10,2), allowNull: true},
    terms: {
      type: DataTypes.ARRAY(DataTypes.INTEGER),
      allowNull: false,
      defaultValue: []
    },
    type: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: [_.values(PROJECT_TYPE)]
      }
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: [_.values(PROJECT_STATUS)]
      }
    },
    details: { type: DataTypes.JSON },
    challengeEligibility: DataTypes.JSON,
    deletedAt: { type: DataTypes.DATE, allowNull: true },
    createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    createdBy: { type: DataTypes.INTEGER, allowNull: false },
    updatedBy: { type: DataTypes.INTEGER, allowNull: false }
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
      { fields: ['directProjectId'] }
    ],
    classMethods: {
      /*
       * @Co-pilots should be able to view projects any of the following conditions are met:
       * a. they are registered active project members on the project
       * b. any project that is in 'reviewed' state AND does not yet have a co-pilot assigned
       * @param userId the id of user
       */
      getProjectIdsForCopilot: function(userId) {
        return this.findAll({
          where: {
            $or: [
              ['EXISTS(SELECT * FROM "project_members" WHERE "deletedAt" IS NULL AND "projectId" = "Project".id AND "userId" = ? )', userId],
              ['"Project".status=? AND NOT EXISTS(SELECT * FROM "project_members" WHERE "deletedAt" IS NULL AND "projectId" = "Project".id AND "role" = ? )',
                PROJECT_STATUS.REVIEWED,  PROJECT_MEMBER_ROLE.COPILOT]
            ]
          },
          attributes:['id'],
          raw: true
        })
            .then((res) => {
              return _.map(res, 'id')
            })
      },
      /**
       * Get direct project id
       * @param id the id of project
       */
      getDirectProjectId: function(id) {
        return this.findById(id, {
          attributes:['directProjectId'],
          raw: true
        })
            .then((res) => {
              return res.directProjectId
            })
      },
      associate: (models) => {
        Project.hasMany(models.ProjectMember, { as : 'members', foreignKey: 'projectId' })
        Project.hasMany(models.ProjectAttachment, { as : 'attachments', foreignKey: 'projectId' })
      }
    }
  })

  return Project
}
