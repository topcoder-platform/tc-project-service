/* eslint-disable valid-jsdoc, no-param-reassign */
import util from '../util';
import {
  MANAGER_ROLES,
  PROJECT_MEMBER_ROLE,
  ADMIN_ESTIMATION_ITEM_TYPES,
  COPILOT_ESTIMATION_ITEM_TYPES,
} from '../constants';

/**
 * The Project Estimation Item model
 */
module.exports = (sequelize, DataTypes) => {
  const ProjectEstimationItem = sequelize.define('ProjectEstimationItem', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    projectEstimationId: { type: DataTypes.BIGINT, allowNull: false },
    price: { type: DataTypes.DOUBLE, allowNull: false },
    type: { type: DataTypes.STRING(255), allowNull: false },
    markupUsedReference: { type: DataTypes.STRING(255), allowNull: false },
    markupUsedReferenceId: { type: DataTypes.BIGINT, allowNull: false },
    metadata: { type: DataTypes.JSON, allowNull: false, defaultValue: {} },
    deletedAt: DataTypes.DATE,
    createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    deletedBy: DataTypes.BIGINT,
    createdBy: { type: DataTypes.BIGINT, allowNull: false },
    updatedBy: { type: DataTypes.BIGINT, allowNull: false },
  }, {
    tableName: 'project_estimation_items',
    paranoid: true,
    timestamps: true,
    updatedAt: 'updatedAt',
    createdAt: 'createdAt',
    deletedAt: 'deletedAt',
    hooks: {
      beforeFind: (options, callback) => {
        if (!options.reqUser || !options.members) {
          callback(new Error(
            'You must provide auth user and project members to get project estimation items'));
        } else if (util.hasPermission({ topcoderRoles: MANAGER_ROLES }, options.reqUser, options.members)) {
          // do nothing. admins can see every field.
          options.where.type = ADMIN_ESTIMATION_ITEM_TYPES;
          callback(null);
        } else if (util.hasPermission(
          { projectRoles: PROJECT_MEMBER_ROLE.COPILOT },
          options.reqUser,
          options.members)) {
          options.where.type = COPILOT_ESTIMATION_ITEM_TYPES;
          callback(null);
        } else {
          options.where.type = { $eq: null };
          callback(null);
        }
      },
    },
  });

  return ProjectEstimationItem;
};
