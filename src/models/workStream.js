/* eslint-disable valid-jsdoc */

/**
 * The WorkStream model
 */
import _ from 'lodash';
import { WORKSTREAM_STATUS } from '../constants';

module.exports = (sequelize, DataTypes) => {
  const WorkStream = sequelize.define('WorkStream', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING(255), allowNull: false },
    type: { type: DataTypes.STRING(45), allowNull: false },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: [_.values(WORKSTREAM_STATUS)],
      },
    },
    deletedAt: { type: DataTypes.DATE, allowNull: true },
    createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    deletedBy: { type: DataTypes.INTEGER, allowNull: true },
    createdBy: { type: DataTypes.INTEGER, allowNull: false },
    updatedBy: { type: DataTypes.INTEGER, allowNull: false },
  }, {
    tableName: 'work_streams',
    paranoid: true,
    timestamps: true,
    updatedAt: 'updatedAt',
    createdAt: 'createdAt',
    deletedAt: 'deletedAt',
    indexes: [],
  });

  WorkStream.associate = (models) => {
    WorkStream.belongsToMany(models.ProjectPhase, { through: models.PhaseWorkStream, foreignKey: 'workStreamId' });
  };

  return WorkStream;
};
