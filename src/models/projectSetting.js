/* eslint-disable valid-jsdoc */
/**
 * ProjectSetting model
 *
 * WARNING: This model contains sensitive data!
 *
 * - To return data from this model to the user always use methods `find`/`findAll`
 *   and provide to them `options.reqUser` and `options.members` to check which records could be returned
 *   based on the user roles and `readPermission` property of the records.
 * - For internal usage you can use `options.includeAllProjectSettingsForInternalUsage`
 *   which would force `find`/`findAll` to return all the records without checking permissions.
 *   Use the data returned in such way ONLY FOR INTERNAL usage. It means such data can be used
 *   to make some calculations inside Project Service but it should be never returned to the user as it is.
 */

import _ from 'lodash';
import { VALUE_TYPE } from '../constants';
import util from '../util';

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
      deletedBy: DataTypes.INTEGER,
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
        /**
         * Inside before hook we are checking that required options are provided
         * We do it in `beforeFind` instead of `afterFind` to avoid unnecessary data retrievement
         *
         * @param {Object}   options  find/findAll options
         * @param {Function} callback callback after hook
         */
        beforeFind: (options, callback) => {
          // ONLY FOR INTERNAL USAGE: don't use this option to return the data by API
          if (options.includeAllProjectSettingsForInternalUsage) {
            return callback ? callback(null) : null;
          }

          if (!options.reqUser || !options.members) {
            const err = new Error('You must provide reqUser and project member to get project settings');
            if (!callback) throw err;
            return callback(err);
          }

          return callback ? callback(null) : null;
        },

        /**
         * Inside after hook we are filtering records based on `readPermission` and user roles
         *
         * @param {Mixed}    results  one result from `find()` or array of results form `findAll()`
         * @param {Object}   options  find/findAll options
         * @param {Function} callback callback after hook
         */
        afterFind: (results, options, callback) => {
          // ONLY FOR INTERNAL USAGE: don't use this option to return the data by API
          if (options.includeAllProjectSettingsForInternalUsage) {
            return callback ? callback(null) : null;
          }

          // if we have an array of results form `findAll()` we are filtering results
          if (_.isArray(results)) {
            // remove results from the "end" using `index` if user doesn't have permissions for to access them
            for (let index = results.length - 1; index >= 0; index -= 1) {
              if (!util.hasPermission(results[index].readPermission, options.reqUser, options.members)) {
                results.splice(index, 1);
              }
            }

          // if we have one result from `find()` we check if user has permission for the record
          } else if (results && !util.hasPermission(results.readPermission, options.reqUser, options.members)) {
            const err = new Error('User doesn\'t have permission to access this record.');
            if (!callback) throw err;
            return callback(err);
          }

          return callback ? callback(null) : null;
        },
      },
    },
  );

  return ProjectSetting;
};
