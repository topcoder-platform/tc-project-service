/**
 * API to list project setting
 */
import _ from 'lodash';
import validate from 'express-validation';
import Joi from 'joi';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import models from '../../models';

const permissions = tcMiddleware.permissions;

const schema = {
  query: {
    includeAllProjectSettingsForInternalUsage: Joi.boolean().optional(),
  },
};

module.exports = [
  validate(schema),
  permissions('projectSetting.view'),
  (req, res, next) => {
    const projectId = req.params.projectId;
    const options = {
      where: {
        projectId,
      },
      attributes: { exclude: ['deletedAt', 'deletedBy'] },
      raw: true,
      // provide current user and project members list so `ProjectSetting.findAll` will return
      // only records available to view by the current user
      reqUser: req.authUser,
      members: req.context.currentProjectMembers,
    };

    models.Project.findOne({ where: { id: projectId } })
      .then((project) => {
        if (!project) {
          const apiErr = new Error(`Project not found for id ${projectId}`);
          apiErr.status = 404;
          return Promise.reject(apiErr);
        }

        return models.ProjectSetting.findAll(options);
      })
      .then((result) => {
        res.json(_.filter(result, r => r));
      })
      .catch(next);
  },
];
