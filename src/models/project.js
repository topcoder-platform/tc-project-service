'use strict'
import { PROJECT_TYPE, PROJECT_STATUS } from '../constants'
import _ from 'lodash'

module.exports = function(sequelize, DataTypes) {
  var Project = sequelize.define('Project', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    legacyProjectId: { type: DataTypes.STRING, allowNull: true },
    directProjectId: DataTypes.BIGINT,
    billingAccountId: DataTypes.STRING,
    name: { type: DataTypes.STRING, allowNull: false },
    description: DataTypes.TEXT,
    external: DataTypes.JSON,
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
      { fields: ['legacyProjectId'] },
      { fields: ['directProjectId'] }
    ],
    classMethods: {
      associate: (models) => {
        Project.hasMany(models.ProjectMember, { as : 'members', foreignKey: 'projectId' })
        Project.hasMany(models.ProjectAttachment, { as : 'attachments', foreignKey: 'projectId' })
      }
    }
  })

  return Project
}
