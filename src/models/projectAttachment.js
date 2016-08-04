'use strict'

module.exports = function(sequelize, DataTypes) {
  var ProjectAttachment = sequelize.define('ProjectAttachment', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    title: { type: DataTypes.STRING, allowNull: true },
    description: { type: DataTypes.STRING, allowNull: true},
    filePath: { type: DataTypes.STRING, allowNull: false },
    contentType: { type: DataTypes.STRING, allowNull: false },
    deletedAt: { type: DataTypes.DATE, allowNull: true },
    createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    createdBy: { type: DataTypes.INTEGER, allowNull: false },
    updatedBy: { type: DataTypes.INTEGER, allowNull: false }
  }, {
    tableName: 'project_attachments',
    paranoid: true,
    timestamps: true,
    updatedAt: 'updatedAt',
    createdAt: 'createdAt',
    deletedAt: 'deletedAt',
    indexes: [],
    classMethods: {
      getActiveProjectAttachments: function(projectId) {
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

  return ProjectAttachment
}
