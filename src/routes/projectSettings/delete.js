/**
 * API to delete a project setting
 */
import validate from 'express-validation';
import Joi from 'joi';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import util from '../../util';
import models from '../../models';

const permissions = tcMiddleware.permissions;

const schema = {
  params: {
    projectId: Joi.number().integer().positive().required(),
    id: Joi.number().integer().positive().required(),
  },
};

module.exports = [
  validate(schema),
  permissions('projectSetting.delete'),
  (req, res, next) => {
    const projectId = req.params.projectId;
    const id = req.params.id;
    let deletedEntity = null;

    models.sequelize.transaction(() =>
      models.ProjectSetting.findOne({
        includeAllProjectSettingsForInternalUsage: true,
        where: {
          id,
          projectId,
        },
      })
        .then((entity) => {
        // Not found
          if (!entity) {
            const apiErr = new Error(`Project setting not found for id ${id} and project id ${projectId}`);
            apiErr.status = 404;
            return Promise.reject(apiErr);
          }

          deletedEntity = entity;
          // Update the deletedBy, then delete
          return entity.update({ deletedBy: req.authUser.userId });
        })
        .then(entity => entity.destroy())
        .then(() => {
        // Calculate for valid estimation type
          if (util.isProjectSettingForEstimation(deletedEntity.key)) {
            req.log.debug(`Recalculate price breakdown for project id ${projectId}`);
            return util.calculateProjectEstimationItems(req, projectId);
          }

          return Promise.resolve();
        }),
    ) // transaction end
      .then(() => {
        res.status(204).end();
      })
      .catch(next);
  },
];
