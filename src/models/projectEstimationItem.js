import _ from 'lodash';
import util from '../util';
import {
  ESTIMATION_TYPE,
  MANAGER_ROLES,
  PROJECT_MEMBER_ROLE,
  ADMIN_ESTIMATION_ITEM_TYPES,
  COPILOT_ESTIMATION_ITEM_TYPES,
} from '../constants';

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
        beforeFind: (options, callback) => {
          if (options.includeAllProjectEstimatinoItemsForInternalUsage) {
            callback(null);
          }

          /* eslint-disable no-param-reassign */
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
          /* eslint-enable no-param-reassign */
        },
      },
      classMethods: {
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
        findAllByProject(models, projectId, options) {
          return models.ProjectEstimation.findAll({
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

            return this.findAll(optionsCombined);
          });
        },

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
        deleteAllForProject(models, projectId, reqUser, options) {
          return this.findAllByProject(models, projectId, options)
            .then((estimationItems) => {
              const estimationItemsOptions = {
                where: {
                  id: _.map(estimationItems, 'id'),
                },
              };

              return this.update({ deletedBy: reqUser.userId }, estimationItemsOptions)
                .then(() => this.destroy(estimationItemsOptions));
            });
        },
      },
    },
  );

  return ProjectEstimationItem;
};
