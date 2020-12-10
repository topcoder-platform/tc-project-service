/**
 * API to add a project setting
 */
import validate from 'express-validation';
import _ from 'lodash';
import Joi from 'joi';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import util from '../../util';
import models from '../../models';
import { VALUE_TYPE } from '../../constants';

const permissions = tcMiddleware.permissions;

const schema = {
  params: {
    projectId: Joi.number().integer().positive().required(),
  },
  body: Joi.object().keys({
    key: Joi.string().max(255).required(),
    value: Joi.string().max(255).required(),
    valueType: Joi.string().valid(_.values(VALUE_TYPE)).required(),
    projectId: Joi.any().strip(),
    metadata: Joi.object().optional(),
    readPermission: Joi.object().required(),
    writePermission: Joi.object().required(),
  }).required(),
};

module.exports = [
  validate(schema),
  permissions('projectSetting.create'),
  (req, res, next) => {
    let setting = null;
    const projectId = req.params.projectId;
    const entity = _.assign(req.body, {
      createdBy: req.authUser.userId,
      updatedBy: req.authUser.userId,
      projectId,
    });

    // Check if project exists
    models.sequelize.transaction(() =>
      models.Project.findOne({ where: { id: projectId } })
        .then((project) => {
          if (!project) {
            const apiErr = new Error(`Project not found for id ${projectId}`);
            apiErr.status = 404;
            return Promise.reject(apiErr);
          }

          // Find project setting
          return models.ProjectSetting.findOne({
            includeAllProjectSettingsForInternalUsage: true,
            where: {
              projectId,
              key: req.body.key,
            },
            paranoid: false,
          });
        })
        .then((projectSetting) => {
          if (projectSetting) {
            const apiErr = new Error(`Project Setting already exists for project id ${projectId} ` +
              `and key ${req.body.key}`);
            apiErr.status = 400;
            return Promise.reject(apiErr);
          }

          // Create
          return models.ProjectSetting.create(entity);
        })
        .then(async (createdEntity) => {
          setting = createdEntity;
          // Calculate for valid estimation type
          if (util.isProjectSettingForEstimation(createdEntity.key)) {
            req.log.debug(`Recalculate price breakdown for project id ${projectId}`);
            return util.calculateProjectEstimationItems(req, projectId);
          }

          return Promise.resolve();
        }),
    ) // transaction end
      .then(() => {
        req.log.debug('new project setting created (id# %d, key: %s)',
          setting.id, setting.key);
        // Omit deletedAt, deletedBy
        res.status(201).json(_.omit(setting.toJSON(), 'deletedAt', 'deletedBy'));
      })
      .catch(next);
  },
];
