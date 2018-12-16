
import _ from 'lodash';
import { PROJECT_MEMBER_ROLE, INVITE_STATUS } from '../constants';

module.exports = function defineProjectMemberInvite(sequelize, DataTypes) {
  const ProjectMemberInvite = sequelize.define('ProjectMemberInvite', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    projectId: DataTypes.BIGINT,
    userId: DataTypes.BIGINT,
    email: {
      type: DataTypes.STRING,
      validate: {
        isEmail: true,
      },
    },
    role: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: [_.values(PROJECT_MEMBER_ROLE)],
      },
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: [_.values(INVITE_STATUS)],
      },
    },
    createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    deletedAt: { type: DataTypes.DATE, allowNull: true },
    createdBy: { type: DataTypes.INTEGER, allowNull: false },
    updatedBy: { type: DataTypes.INTEGER, allowNull: false },
    deletedBy: DataTypes.BIGINT,
  }, {
    tableName: 'project_member_invites',
    paranoid: true,
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    deletedAt: 'deletedAt',
    indexes: [
      { fields: ['projectId'] },
      { fields: ['status'] },
      { fields: ['deletedAt'] },
    ],
    classMethods: {
      getPendingInvitesForProject(projectId) {
        return this.findAll({
          where: {
            projectId,
            status: INVITE_STATUS.PENDING,
          },
          raw: true,
        });
      },
      getPendingInviteByEmailOrUserId(projectId, email, userId) {
        const where = { status: INVITE_STATUS.PENDING };

        if (email) {
          _.assign(where, { email });
        } else if (userId) {
          _.assign(where, { userId });
        }
        return this.findOne({
          where,
        });
      },
      getProjectInvitesForUser(email, userId) {
        const where = { status: INVITE_STATUS.PENDING };

        if (email) {
          _.assign(where, { email });
        } else if (userId) {
          _.assign(where, { userId });
        }
        return this.findAll({
          where,
        }).then(res => _.without(_.map(res, 'projectId'), null));
      },
    },
  });

  return ProjectMemberInvite;
};
