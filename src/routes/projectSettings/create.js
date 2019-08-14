/**
 * API to add a project setting
 */
import validate from 'express-validation';
import _ from 'lodash';
import Joi from 'joi';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import util from '../../util';
import models from '../../models';
import { VALUE_TYPE, ESTIMATION_TYPE } from '../../constants';

const permissions = tcMiddleware.permissions;

const schema = {
  params: {
    projectId: Joi.number().integer().positive().required(),
  },
  body: {
    param: Joi.object().keys({
      key: Joi.string().max(255).required(),
      value: Joi.string().max(255).required(),
      valueType: Joi.string().valid(_.values(VALUE_TYPE)).required(),
      projectId: Joi.any().strip(),
      metadata: Joi.object().optional(),
      readPermission: Joi.object().required(),
      writePermission: Joi.object().required(),
      createdAt: Joi.any().strip(),
      updatedAt: Joi.any().strip(),
      deletedAt: Joi.any().strip(),
      createdBy: Joi.any().strip(),
      updatedBy: Joi.any().strip(),
      deletedBy: Joi.any().strip(),
    }).required(),
  },
};

module.exports = [
  validate(schema),
  permissions('projectSetting.create'),
  // eslint-disable-next-line consistent-return
  (req, res, next) => {
    let setting = null;
    const projectId = req.params.projectId;
    const entity = _.assign(req.body.param, {
      createdBy: req.authUser.userId,
      updatedBy: req.authUser.userId,
    });

    if (_.includes(ESTIMATION_TYPE, entity.key.split('markup_')[1])
      && entity.valueType === VALUE_TYPE.PERCENTAGE
      && (entity.value <= 0 || entity.value > 100)) {
      const apiErr = new Error(`Estimation value as a ${entity.valueType} should be between 1 and 100`);
      apiErr.status = 422;
      return next(apiErr);
    }

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
            reqUser: req.authUser,
            where: {
              projectId,
              key: req.body.param.key,
            },
            paranoid: false,
          });
        })
        .then((projectSetting) => {
          if (projectSetting) {
            const apiErr = new Error(`Project Setting already exists for project id ${projectId}` +
              `and key ${req.body.param.key}`);
            apiErr.status = 422;
            return Promise.reject(apiErr);
          }

          if (projectSetting && projectSetting.noAccess) {
            const apiErr = new Error('You do not have permissions to perform this action');
            apiErr.status = 403;
            return Promise.reject(apiErr);
          }

          const body = req.body.param;
          body.projectId = projectId;
          // Create
          return models.ProjectSetting.create(entity);
        }),
      )
      .then((createdEntity) => {
        setting = createdEntity;
        // Calculate for valid estimation type
        if (_.includes(_.values(ESTIMATION_TYPE), createdEntity.key.split('markup_')[1])) {
          return util.calculateProjectEstimationItems(req, projectId);
        }

        return Promise.resolve();
      })
      .then(() => {
        req.log.debug('new project setting created (id# %d, key: %s)',
          setting.id, setting.key);
        // Omit deletedAt, deletedBy
        res.status(201).json(util.wrapResponse(
          req.id, _.omit(setting.toJSON(), 'deletedAt', 'deletedBy'), 1, 201));
      })
      .catch(next);
  },
];
