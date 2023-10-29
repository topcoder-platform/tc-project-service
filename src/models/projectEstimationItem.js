/* eslint-disable valid-jsdoc */
/**
 * ProjectEstimationItem model
 *
 * WARNING: This model contains sensitive data!
 *
 * - To return data from this model to the user always use methods `find`/`findAll`
 *   and provide to them `options.reqUser` and `options.members` to check what
 *   types of Project Estimation Items user which makes the request can get.
 * - For internal usage you can use `options.includeAllProjectEstimatinoItemsForInternalUsage`
 *   which would force `find`/`findAll` to return all the records without checking permissions.
 *   Use the data returned in such way ONLY FOR INTERNAL usage. It means such data can be used
 *   to make some calculations inside Project Service but it should be never returned to the user as it is.
 */
import _ from 'lodash';
import util from '../util';
import {
  ESTIMATION_TYPE,
  MANAGER_ROLES,
  PROJECT_MEMBER_ROLE,
} from '../constants';

/*
  This config defines which Project Estimation Item `types` users can get
  based on their permissions
 */
const permissionsConfigs = [
  // Topcoder managers can get all types of Project Estimation Items
  {
    permission: { topcoderRoles: MANAGER_ROLES },
    types: _.values(ESTIMATION_TYPE),
  },

  // Project Copilots can get only 'community' type of Project Estimation Items
  {
    permission: { projectRoles: [PROJECT_MEMBER_ROLE.COPILOT] },
    types: [ESTIMATION_TYPE.COMMUNITY],
  },
];

module.exports = function defineProjectEstimationItem(sequelize, DataTypes) {
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
      deletedBy: DataTypes.INTEGER,
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
      hooks: {
        /**
         * Inside before hook we are evaluating what Project Estimation Item types current user may retrieve.
         * We update `where` query so only allowed types may be retrieved.
         *
         * @param {Object}   options  find/findAll options
         * @param {Function} callback callback after hook
         */
        beforeFind: (options, callback) => {
          // ONLY FOR INTERNAL USAGE: don't use this option to return the data by API
          if (options.includeAllProjectEstimatinoItemsForInternalUsage) {
            return callback ? callback(null) : null;
          }

          if (!options.reqUser || !options.members) {
            const err = new Error('You must provide auth user and project members to get project estimation items');
            if (!callback) throw err;
            return callback(err);
          }

          // find all project estimation item types which are allowed to be returned to the user
          let allowedTypes = [];
          permissionsConfigs.forEach((permissionsConfig) => {
            if (util.hasPermission(permissionsConfig.permission, options.reqUser, options.members)) {
              allowedTypes = _.concat(allowedTypes, permissionsConfig.types);
            }
          });
          allowedTypes = _.uniq(allowedTypes);

          // only return Project Estimation Types which are allowed to the user
          options.where.type = allowedTypes; // eslint-disable-line no-param-reassign
          return callback ? callback(null) : null;
        },
      },
    },
  );

  /**
   * Find all project estimation items for project
   *
   * TODO: this method can rewritten without using `models`
   *       and using JOIN instead for retrieving ProjectEstimationTimes by projectId
   *
   * @param {Object} models    all models
   * @param {Number} projectId project id
   * @param {Object} [options] options
   *
   * @returns {Promise} list of project estimation items
   */
  ProjectEstimationItem.findAllByProject = (models, projectId, options) =>
    models.ProjectEstimation.findAll({
      raw: true,
      where: {
        projectId,
      },
    }).then((estimations) => {
      const optionsCombined = _.assign({}, options);
      // update where to always filter by projectEstimationsIds of the project
      optionsCombined.where = _.assign({}, optionsCombined.where, {
        projectEstimationId: _.map(estimations, 'id'),
      });

      return ProjectEstimationItem.findAll(optionsCombined);
    });

  /**
   * Delete all project estimation items for project
   *
   * TODO: this method can rewritten without using `models`
   *       and using JOIN instead for retrieving ProjectEstimationTimes by projectId
   *
   * @param {Object} models    all models
   * @param {Number} projectId project id
   * @param {Object} reqUser   user who makes the request
   * @param {Object} [options] options
   *
   * @returns {Promise} result of destroy query
   */
  ProjectEstimationItem.deleteAllForProject = (models, projectId, reqUser, options) =>
    ProjectEstimationItem.findAllByProject(models, projectId, options)
      .then((estimationItems) => {
        const estimationItemsOptions = {
          where: {
            id: _.map(estimationItems, 'id'),
          },
        };

        return ProjectEstimationItem.update({ deletedBy: reqUser.userId }, estimationItemsOptions)
          .then(() => ProjectEstimationItem.destroy(estimationItemsOptions));
      });

  return ProjectEstimationItem;
};
