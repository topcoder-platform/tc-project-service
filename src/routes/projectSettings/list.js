/**
 * API to list project setting
 */
import _ from 'lodash';
import validate from 'express-validation';
import Joi from 'joi';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import models from '../../models';
import util from '../../util';

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
    };
    // when user query with includeAllProjectSettingsForInternalUsage,
    // return result with all ProjectSettings records to make calculations
    if (req.query.includeAllProjectSettingsForInternalUsage) {
      options.includeAllProjectSettingsForInternalUsage = req.query.includeAllProjectSettingsForInternalUsage;
    } else {
      options.reqUser = req.authUser;
    }

    models.Project.count({
      where: {
        id: projectId,
      },
    })
    .then((countProject) => {
      if (countProject === 0) {
        const apiErr = new Error(`active project not found for project id ${projectId}`);
        apiErr.status = 404;
        throw apiErr;
      }

      return models.ProjectSetting.findAll(options);
    })
    .then((result) => {
      res.json(util.wrapResponse(req.id, _.filter(result, r => r)));
    })
    .catch(next);
  },
];
