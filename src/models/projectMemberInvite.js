
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
  });

  ProjectMemberInvite.getPendingInvitesForProject = projectId => ProjectMemberInvite.findAll({
    where: {
      projectId,
      status: INVITE_STATUS.PENDING,
    },
    raw: true,
  });

  ProjectMemberInvite.getPendingAndReguestedInvitesForProject = projectId => ProjectMemberInvite.findAll({
    where: {
      projectId,
      status: { $in: [INVITE_STATUS.PENDING, INVITE_STATUS.REQUESTED] },
    },
    raw: true,
  });

  ProjectMemberInvite.getPendingOrRequestedProjectInvitesForUser = (projectId, email, userId) => {
    const where = {
      projectId,
      status: { $in: [INVITE_STATUS.PENDING, INVITE_STATUS.REQUESTED] },
    };

    if (email && userId) {
      _.assign(where, { $or: [{ email: { $eq: email } }, { userId: { $eq: userId } }] });
    } else if (email) {
      _.assign(where, { email });
    } else if (userId) {
      _.assign(where, { userId });
    }
    return ProjectMemberInvite.findAll({
      where,
      raw: true,
    });
  };

  ProjectMemberInvite.getPendingInviteByIdForUser = (projectId, inviteId, email, userId) => {
    const where = {
      projectId,
      id: inviteId,
      status: INVITE_STATUS.PENDING,
    };

    if (email && userId) {
      _.assign(where, { $or: [{ email: { $eq: email } }, { userId: { $eq: userId } }] });
    } else if (email) {
      _.assign(where, { email });
    } else if (userId) {
      _.assign(where, { userId });
    }
    return ProjectMemberInvite.findOne({
      where,
      raw: true,
    });
  };

  ProjectMemberInvite.getPendingInviteByEmailOrUserId = (projectId, email, userId) => {
    const where = { projectId, status: INVITE_STATUS.PENDING };

    if (email && userId) {
      _.assign(where, { $or: [
        { email: { $eq: email.toLowerCase() } },
        { userId: { $eq: userId } },
      ] });
    } else if (email) {
      _.assign(where, { email });
    } else if (userId) {
      _.assign(where, { userId });
    }
    return ProjectMemberInvite.findOne({
      where,
    });
  };

  ProjectMemberInvite.getRequestedInvite = (projectId, userId) => {
    const where = { projectId, status: INVITE_STATUS.REQUESTED };

    if (userId) {
      _.assign(where, { userId });
    }
    return ProjectMemberInvite.findOne({
      where,
    });
  };

  ProjectMemberInvite.getProjectInvitesForUser = (email, userId) => {
    const where = { status: INVITE_STATUS.PENDING };

    if (email && userId) {
      _.assign(where, { $or: [{ email: { $eq: email } }, { userId: { $eq: userId } }] });
    } else if (email) {
      _.assign(where, { email });
    } else if (userId) {
      _.assign(where, { userId });
    }
    return ProjectMemberInvite.findAll({
      where,
    }).then(res => _.without(_.map(res, 'projectId'), null));
  };

  ProjectMemberInvite.getPendingOrRequestedProjectInviteById = (projectId, inviteId) => ProjectMemberInvite.findOne({
    where: {
      projectId,
      id: inviteId,
      status: { $in: [INVITE_STATUS.PENDING, INVITE_STATUS.REQUESTED] },
    },
  });

  return ProjectMemberInvite;
};
