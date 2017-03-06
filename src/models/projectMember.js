
import _ from 'lodash';
import { PROJECT_MEMBER_ROLE } from '../constants';

module.exports = function defineProjectMember(sequelize, DataTypes) {
  const ProjectMember = sequelize.define('ProjectMember', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    userId: DataTypes.BIGINT,
    role: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: [_.values(PROJECT_MEMBER_ROLE)],
      },
    },
    isPrimary: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    deletedAt: { type: DataTypes.DATE, allowNull: true },
    createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    createdBy: { type: DataTypes.INTEGER, allowNull: false },
    updatedBy: { type: DataTypes.INTEGER, allowNull: false },
  }, {
    tableName: 'project_members',
    paranoid: true,
    timestamps: true,
    updatedAt: 'updatedAt',
    createdAt: 'createdAt',
    deletedAt: 'deletedAt',
    indexes: [
      { fields: ['deletedAt'] },
      { fields: ['userId'] },
      { fields: ['role'] },
    ],
    classMethods: {
      getProjectIdsForUser(userId) {
        return this.findAll({
          where: {
            deletedAt: { $eq: null },
            userId,
          },
          attributes: ['projectId'],
          raw: true,
        })
        .then(res => _.without(_.map(res, 'projectId'), null));
      },
      getActiveProjectMembers(projectId) {
        return this.findAll({
          where: {
            deletedAt: { $eq: null },
            projectId,
          },
          raw: true,
        });
      },
    },
  });

  return ProjectMember;
};
