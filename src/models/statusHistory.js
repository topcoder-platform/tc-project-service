/* eslint-disable valid-jsdoc */

import _ from 'lodash';
import { MILESTONE_STATUS } from '../constants';

module.exports = function defineStatusHistory(sequelize, DataTypes) {
  const StatusHistory = sequelize.define('StatusHistory', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    reference: { type: DataTypes.STRING, allowNull: false },
    referenceId: { type: DataTypes.BIGINT, allowNull: false },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: [_.values(MILESTONE_STATUS)],
      },
    },
    comment: DataTypes.TEXT,
    createdBy: { type: DataTypes.INTEGER, allowNull: false },
    createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updatedBy: { type: DataTypes.INTEGER, allowNull: false },
    updatedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  }, {
    tableName: 'status_history',
    paranoid: false,
    timestamps: true,
    updatedAt: 'updatedAt',
    createdAt: 'createdAt',
    deletedAt: 'deletedAt',
    indexes: [],
    classMethods: {},
  });

  return StatusHistory;
};
