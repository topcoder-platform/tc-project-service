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
      classMethods: {
        /**
         * Find all project estimation items for project
         *
         * TODO: this method can rewritten without using `models`
         *       and using JOIN instead for retrieving ProjectEstimationTimes by projectId
         *
         * @param {Object} models    all models
         * @param {Number} projectId project id
         * @param {Object} [where]   additional where request
         * @param {Object} [options] options
         *
         * @returns {Promise}
         */
        findAllByProject(models, projectId, options) {
          return models.ProjectEstimation.findAll({
            raw: true,
            where: {
              projectId,
            }
          }).then((estimations) => {
            const optionsCombined = _.assign({}, options);
            // update where to always filter by projectEstimationsIds of the project
            optionsCombined.where = _.assign({}, optionsCombined.where, {
              projectEstimationId: _.map(estimations, 'id'),
            })

            return this.findAll(optionsCombined)
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
         *
         * @returns {Promise}
         */
        deleteAllForProject(models, projectId, reqUser) {
          return this.findAllByProject(models, projectId)
            .then((estimationItems) => {
              const estimationItemsOptions = {
                where: {
                  id: _.map(estimationItems, 'id'),
                }
              };

              return this.update({ deletedBy: reqUser.userId, }, estimationItemsOptions)
                .then(() => this.destroy(estimationItemsOptions));
            });
        }
      }
    },
  );

  return ProjectEstimationItem;
};
