/**
 * API to update a project setting
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
    id: Joi.number().integer().positive().required(),
  },
  body: Joi.object().keys({
    value: Joi.string().max(255),
    valueType: Joi.string().valid(_.values(VALUE_TYPE)),
    projectId: Joi.any().strip(),
    metadata: Joi.object(),
    readPermission: Joi.object(),
    writePermission: Joi.object(),
  }).required(),
};

module.exports = [
  validate(schema),
  permissions('projectSetting.edit'),
  (req, res, next) => {
    let oldKey = null;
    let updatedSetting = null;
    const projectId = req.params.projectId;
    const id = req.params.id;
    const entityToUpdate = _.assign(req.body, {
      updatedBy: req.authUser.userId,
    });

    models.sequelize.transaction(() =>
      models.ProjectSetting.findOne({
        includeAllProjectSettingsForInternalUsage: true,
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

          oldKey = existing.key;
          return existing.update(entityToUpdate);
        })
        .then((updated) => {
          updatedSetting = updated;
          if (util.isProjectSettingForEstimation(updatedSetting.key) || util.isProjectSettingForEstimation(oldKey)) {
            req.log.debug(`Recalculate price breakdown for project id ${projectId}`);
            return util.calculateProjectEstimationItems(req, projectId);
          }
          return Promise.resolve();
        }),
    ) // transaction end
      .then(() => {
        res.json(updatedSetting);
      })
      .catch(next);
  },
];
