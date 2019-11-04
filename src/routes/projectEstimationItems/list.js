/**
 * API to get project estimation items
 */
import validate from 'express-validation';
import Joi from 'joi';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import models from '../../models';

const permissions = tcMiddleware.permissions;

const schema = {
  params: {
    projectId: Joi.number().integer().positive().required(),
    estimationId: Joi.number().integer().positive().required(),
  },
};

module.exports = [
  validate(schema),
  permissions('projectEstimation.item.list'),
  (req, res, next) => models.ProjectEstimation.findOne({
    where: {
      id: req.params.estimationId,
      projectId: req.params.projectId,
      deletedAt: { $eq: null },
    },
    raw: true,
  }).then((estimation) => {
    if (!estimation) {
      const apiErr = new Error('Project Estimation not found for projectId ' +
        `${req.params.projectId} and estimation id ${req.params.estimationId}`);
      apiErr.status = 404;
      return Promise.reject(apiErr);
    }
    return models.ProjectEstimationItem.findAll({
      where: {
        projectEstimationId: req.params.estimationId,
        deletedAt: { $eq: null },
      },
      attributes: { exclude: ['deletedAt', 'deletedBy'] },
      raw: true,
      reqUser: req.authUser,
      members: req.context.currentProjectMembers,
    }).then((items) => {
      res.json(items);
      return Promise.resolve();
    });
  }).catch(next),
];
