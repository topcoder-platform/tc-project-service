import _ from 'lodash';
import Joi from 'joi';
import validate from 'express-validation';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import models from '../../models';

/**
 * API to list a project phase members.
 */
const permissions = tcMiddleware.permissions;

const listPhaseMemberValidations = {
  params: {
    projectId: Joi.number().integer().positive().required(),
    phaseId: Joi.number().integer().positive().required(),
  },
};

module.exports = [
  // handles request validations
  validate(listPhaseMemberValidations),
  permissions('phaseMember.view'),
  async (req, res, next) => {
    const projectId = _.parseInt(req.params.projectId);
    const phaseId = _.parseInt(req.params.phaseId);
    try {
      const phase = await models.ProjectPhase.findOne({
        where: {
          id: phaseId,
          projectId,
          deletedAt: { $eq: null },
        },
        raw: true,
      });
      if (!phase) {
        const err = new Error('No active project phase found for project id ' +
              `${projectId} and phase id ${phaseId}`);
        err.status = 404;
        throw (err);
      }
      const phaseMembers = await models.ProjectPhaseMember.getPhaseMembers(phaseId);
      res.json(phaseMembers);
    } catch (err) {
      next(err);
    }
  },
];
