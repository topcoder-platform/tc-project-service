/* eslint-disable valid-jsdoc */
import { SCOPE_CHANGE_REQ_STATUS } from '../constants';

/**
 * The ScopeChangeRequest model
 */

module.exports = (sequelize, DataTypes) => {
  const ScopeChangeRequest = sequelize.define('ScopeChangeRequest', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    projectId: { type: DataTypes.BIGINT, allowNull: false },
    oldScope: { type: DataTypes.JSON, allowNull: false },
    newScope: { type: DataTypes.JSON, allowNull: false },
    status: { type: DataTypes.STRING(45), allowNull: false },

    deletedAt: { type: DataTypes.DATE, allowNull: true },
    createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    approvedAt: { type: DataTypes.DATE, allowNull: true },
    deletedBy: { type: DataTypes.INTEGER, allowNull: true },
    createdBy: { type: DataTypes.INTEGER, allowNull: false },
    updatedBy: { type: DataTypes.INTEGER, allowNull: false },
    approvedBy: { type: DataTypes.INTEGER, allowNull: true },
  }, {
    tableName: 'scope_change_requests',
    paranoid: true,
    timestamps: true,
    updatedAt: 'updatedAt',
    createdAt: 'createdAt',
    deletedAt: 'deletedAt',
  });

  ScopeChangeRequest.findScopeChangeRequest = (projectId, { requestId, status }) => {
    const where = {
      projectId,
    };
    if (status) {
      where.status = status;
    }
    if (requestId) {
      where.id = requestId;
    }
    return ScopeChangeRequest.findOne({
      where,
    });
  };

  ScopeChangeRequest.findPendingScopeChangeRequest = projectId =>
    ScopeChangeRequest.findScopeChangeRequest(
      projectId,
      { status: { $in: [SCOPE_CHANGE_REQ_STATUS.PENDING, SCOPE_CHANGE_REQ_STATUS.APPROVED] } },
    );

  ScopeChangeRequest.getProjectScopeChangeRequests = (projectId, status) => {
    const where = {
      projectId,
    };
    if (status) {
      where.status = status;
    }
    return ScopeChangeRequest.findAll({
      where,
      raw: true,
    });
  };

  return ScopeChangeRequest;
};
