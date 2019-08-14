/* eslint-disable valid-jsdoc */

import _ from 'lodash';
import { VALUE_TYPE } from '../constants';
import util from '../util';

const populateSetting = (settings, options) => {
  if (Array.isArray(settings)) {
    const promises = [];
    _.each(settings, (setting) => {
      promises.push(util.hasPermissionForProject(setting.readPermission, options.reqUser, options.projectId)
        .then((r) => {
          if (!r) {
            _.remove(settings, {
              id: setting.id,
            });
          }
        }));
    });

    return Promise.all(promises);
  }

  return util.hasPermissionForProject(settings.readPermission, options.reqUser, options.projectId)
    .then((r) => {
      if (!r) {
        _.map(settings, (s) => {
          if (Object.prototype.hasOwnProperty.call(settings, s)) {
            delete settings[s]; // eslint-disable-line no-param-reassign
          }
        });
      }
    });
};


module.exports = (sequelize, DataTypes) => {
  const ProjectSetting = sequelize.define(
    'ProjectSetting',
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      key: { type: DataTypes.STRING(255) },
      value: { type: DataTypes.STRING(255) },
      valueType: {
        type: DataTypes.STRING,
        validate: {
          isIn: [_.values(VALUE_TYPE)],
        },
      },
      projectId: { type: DataTypes.BIGINT, allowNull: false }, // Project id
      metadata: { type: DataTypes.JSON, allowNull: false, defaultValue: {} },
      readPermission: { type: DataTypes.JSON, allowNull: false, defaultValue: {} },
      writePermission: { type: DataTypes.JSON, allowNull: false, defaultValue: {} },
      deletedAt: { type: DataTypes.DATE, allowNull: true },
      createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
      updatedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
      deletedBy: DataTypes.BIGINT,
      createdBy: { type: DataTypes.INTEGER, allowNull: false },
      updatedBy: { type: DataTypes.INTEGER, allowNull: false },
    },
    {
      tableName: 'project_settings',
      paranoid: true,
      timestamps: true,
      updatedAt: 'updatedAt',
      createdAt: 'createdAt',
      indexes: [
        {
          unique: true,
          fields: ['key', 'projectId'],
        },
      ],
      hooks: {
        beforeFind: (options) => {
          _.assign(options, { projectId: options.where.projectId });
          if (options.includeAllProjectSettingsForInternalUsage) {
            return { where: options.where, attributes: options.attributes };
          }

          if (!options.reqUser) {
            throw new Error('reqUser not found');
          }
          // Check permissions
          return {
            reqUser: options.reqUser,
            where: options.where,
            attributes: options.attributes,
          };
        },

        afterFind: (settings, options) => {
          if (!settings) return Promise.resolve();
          if (options.reqUser) {
            return populateSetting(settings, options);
          }
          return settings;
        },

      },
    },
  );

  return ProjectSetting;
};
