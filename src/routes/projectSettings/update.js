/**
 * API to update a project setting
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
    id: Joi.number().integer().positive().required(),
  },
  body: {
    param: Joi.object().keys({
      key: Joi.string().max(255),
      value: Joi.string().max(255),
      valueType: Joi.string().valid(_.values(VALUE_TYPE)),
      projectId: Joi.any().strip(),
      metadata: Joi.object(),
      readPermission: Joi.object(),
      writePermission: Joi.object(),
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
  permissions('projectSetting.edit'),
  (req, res, next) => {
    let updatedSetting = null;
    let existingSetting = null;
    let oldKey = null;
    const projectId = req.params.projectId;
    const id = req.params.id;
    const entityToUpdate = _.assign(req.body.param, {
      updatedBy: req.authUser.userId,
    });

    return models.ProjectSetting.findOne({
      reqUser: req.authUser,
      where: {
        id,
        projectId,
      },
    })
    .then((existing) => {
      // Not found
      if (!existing) {
        const apiErr = new Error(`Project setting not found for id ${id} and project id ${projectId}`);
        apiErr.status = 404;
        return Promise.reject(apiErr);
      }

      existingSetting = existing;
      if (entityToUpdate.key) {
        return models.ProjectSetting.findOne({
          includeAllProjectSettingsForInternalUsage: true,
          where: {
            projectId,
            key: entityToUpdate.key,
            id: { $ne: id },
          },
        })
        .then((entity) => {
          // found
          if (entity) {
            const apiErr = new Error(`Another Project setting already exists for key ${entityToUpdate.key}` +
            `and project id ${projectId}`);
            apiErr.status = 422;
            return Promise.reject(apiErr);
          }

          return Promise.resolve();
        });
      }

      return Promise.resolve();
    })
      .then(() => {
        oldKey = existingSetting.key;
        return existingSetting.update(entityToUpdate);
      })
      .then((updated) => {
        updatedSetting = updated;
        // Updated from valid to invalid estimation type
        if (!_.includes(_.values(ESTIMATION_TYPE), updatedSetting.key.split('markup_')[1])
          && _.includes(_.values(ESTIMATION_TYPE), oldKey.split('markup_')[1])) {
          req.log.debug('Delete all existing project estimation records');
          return models.ProjectEstimationItem.update({ deletedBy: req.authUser.userId }, {
            where: {
              markupUsedReference: 'projectSetting',
              markupUsedReferenceId: id,
            },
          }).then(() => models.ProjectEstimationItem.destroy({
            where: {
              markupUsedReference: 'projectSetting',
              markupUsedReferenceId: id,
            },
          }));
        }

        return Promise.resolve();
      })
      .then(() => {
        if (_.includes(_.values(ESTIMATION_TYPE), updatedSetting.key.split('markup_')[1])) {
          req.log.debug(`Recalculate price breakdown for project id ${projectId}`);
          return util.calculateProjectEstimationItems(req, projectId);
        }
        return Promise.resolve();
      })
      .then(() => {
        res.json(util.wrapResponse(req.id, updatedSetting));
      })
      .catch(next);
  },
];
