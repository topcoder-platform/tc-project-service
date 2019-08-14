/* eslint-disable valid-jsdoc */

import _ from 'lodash';
import { ESTIMATION_TYPE } from '../constants';

module.exports = function defineProjectHistory(sequelize, DataTypes) {
  const ProjectEstimationItem = sequelize.define(
    'ProjectEstimationItem',
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      projectEstimationId: { type: DataTypes.BIGINT, allowNull: false }, // ProjectEstimation id
      price: { type: DataTypes.DOUBLE, allowNull: false },
      type: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          isIn: [_.values(ESTIMATION_TYPE)],
        },
      },
      markupUsedReference: { type: DataTypes.STRING, allowNull: false },
      markupUsedReferenceId: { type: DataTypes.BIGINT, allowNull: false }, // ProjectSetting id
      metadata: { type: DataTypes.JSON, allowNull: false, defaultValue: {} },
      deletedAt: { type: DataTypes.DATE, allowNull: true },
      createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
      updatedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
      deletedBy: DataTypes.BIGINT,
      createdBy: { type: DataTypes.INTEGER, allowNull: false },
      updatedBy: { type: DataTypes.INTEGER, allowNull: false },
    },
    {
      tableName: 'project_estimation_items',
      paranoid: true,
      timestamps: true,
      updatedAt: 'updatedAt',
      createdAt: 'createdAt',
      indexes: [],
    },
  );

  return ProjectEstimationItem;
};
