'use strict'
var _ = require('lodash')

module.exports = function(sequelize, DataTypes) {
  var ProjectMember = sequelize.define('ProjectMember', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    userId: DataTypes.BIGINT,
    role: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: [['customer', 'manager', 'copilot']]
      }
    },
    isPrimary: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    deletedAt: { type: DataTypes.DATE, allowNull: true },
    createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    createdBy: { type: DataTypes.INTEGER, allowNull: false },
    updatedBy: { type: DataTypes.INTEGER, allowNull: false }
  }, {
    tableName: 'project_members',
    paranoid: true,
    timestamps: true,
    updatedAt: 'updatedAt',
    createdAt: 'createdAt',
    deletedAt: 'deletedAt',
    indexes: [
      { fields: ['userId'] },
      { fields: ['role'] }
    ],
    classMethods: {
      getProjectIdsForUser: function(userId) {
        return this.findAll({
          where: {
            deletedAt: { $eq: null},
            userId: userId
          },
          attributes:['projectId'],
          raw: true
        })
        .then((res) => {
          return _.map(res, 'projectId')
        })
      },
      getActiveProjectMembers: function(projectId) {
        return this.findAll({
          where: {
            deletedAt: { $eq: null },
            projectId: projectId
          },
          raw: true
        })
      }
    }
  })

  return ProjectMember
}
