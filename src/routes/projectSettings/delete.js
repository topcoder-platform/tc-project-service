/**
 * API to delete a project setting
 */
import validate from 'express-validation';
import _ from 'lodash';
import Joi from 'joi';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import util from '../../util';
import models from '../../models';
import { ESTIMATION_TYPE } from '../../constants';

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
        reqUser: req.authUser,
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
        .then(() => models.ProjectEstimationItem.update({ deletedBy: req.authUser.userId }, {
          where: {
            type: deletedEntity.key.split('markup_')[1],
            markupUsedReference: 'projectSetting',
            markupUsedReferenceId: id,
          },
        }))
        .then(() => models.ProjectEstimationItem.findAll({
          where: {
            type: deletedEntity.key.split('markup_')[1],
            markupUsedReference: 'projectSetting',
            markupUsedReferenceId: id,
          },
        }))
        // Delete all Project Estimation Items for the project
        .then(items =>
           _.each((items), item => item.destroy()),
         ),
      )
        .then(() => {
          // Calculate for valid estimation type
          if (_.includes(_.values(ESTIMATION_TYPE), deletedEntity.key.split('markup_')[1])) {
            req.log.debug(`Recalculate price breakdown for project id ${projectId}`);
            return util.calculateProjectEstimationItems(req, projectId);
          }

          return Promise.resolve();
        })
        .then(() => {
          res.status(204).end();
        })
        .catch(next);
  },
];
