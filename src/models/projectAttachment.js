
import _ from 'lodash';
import { ATTACHMENT_TYPES } from '../constants';

module.exports = function defineProjectAttachment(sequelize, DataTypes) {
  const ProjectAttachment = sequelize.define('ProjectAttachment', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    title: { type: DataTypes.STRING, allowNull: true },
    type: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: [_.values(ATTACHMENT_TYPES)],
      },
    },
    tags: DataTypes.ARRAY({ type: DataTypes.STRING, allowNull: true }),
    size: { type: DataTypes.INTEGER, allowNull: true }, // size in MB
    category: { type: DataTypes.STRING, allowNull: true }, // size in MB
    description: { type: DataTypes.STRING, allowNull: true },
    path: { type: DataTypes.STRING(2048), allowNull: false },
    contentType: { type: DataTypes.STRING, allowNull: true },
    allowedUsers: DataTypes.ARRAY({ type: DataTypes.INTEGER, allowNull: true }),
    deletedAt: { type: DataTypes.DATE, allowNull: true },
    createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    deletedBy: DataTypes.BIGINT,
    createdBy: { type: DataTypes.INTEGER, allowNull: false },
    updatedBy: { type: DataTypes.INTEGER, allowNull: false },
  }, {
    tableName: 'project_attachments',
    paranoid: true,
    timestamps: true,
    updatedAt: 'updatedAt',
    createdAt: 'createdAt',
    deletedAt: 'deletedAt',
    indexes: [],
  });

  ProjectAttachment.getActiveProjectAttachments = projectId => ProjectAttachment.findAll({
    where: {
      deletedAt: { $eq: null },
      projectId,
    },
    raw: true,
  });

  ProjectAttachment.getAttachmentById = (projectId, attachmentId) => ProjectAttachment.findOne({
    where: {
      projectId,
      id: attachmentId,
    },
  });

  ProjectAttachment.getAttachmentsForUser = (projectId, userId) => ProjectAttachment.findAll({
    where: {
      projectId,
      $or: [{
        createdBy: { $eq: userId },
      }, {
        allowedUsers: {
          $or: [
            { $contains: [userId] },
            { $eq: null },
          ],
        },
      }],
    },
  });

  return ProjectAttachment;
};
