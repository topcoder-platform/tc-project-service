import _ from 'lodash';
import Joi from 'joi';
import validate from 'express-validation';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import models from '../../models';
import util from '../../util';
import { EVENT, RESOURCES, ROUTES } from '../../constants';
import updateService from './updateService';

/**
 * API to update a project phase members.
 */
const permissions = tcMiddleware.permissions;

const updatePhaseMemberValidations = {
  body: Joi.object().keys({
    userIds: Joi.array().items(Joi.number().integer()).required(),
  }),
  params: {
    projectId: Joi.number().integer().positive().required(),
    phaseId: Joi.number().integer().positive().required(),
  },
};

module.exports = [
  // handles request validations
  validate(updatePhaseMemberValidations),
  permissions('phaseMember.update'),
  async (req, res, next) => {
    const projectId = _.parseInt(req.params.projectId);
    const phaseId = _.parseInt(req.params.phaseId);
    const newPhaseMembers = req.body.userIds;
    try {
      // chekc if project and phase exist
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
      const updatedPhaseMembers = await updateService(req.authUser, projectId, phaseId, newPhaseMembers);
      req.log.debug('updated phase members', JSON.stringify(newPhaseMembers, null, 2));
      const updatedPhase = _.cloneDeep(phase);
      //  emit event
      if (_.intersectionBy(phaseMembers, updatedPhaseMembers, 'id').length !== updatedPhaseMembers.length) {
        util.sendResourceToKafkaBus(
          req,
          EVENT.ROUTING_KEY.PROJECT_PHASE_UPDATED,
          RESOURCES.PHASE,
          _.assign(updatedPhase, { members: updatedPhaseMembers }),
          _.assign(phase, { members: phaseMembers }),
          ROUTES.PHASES.UPDATE);
      }
      res.json(updatedPhaseMembers);
    } catch (err) {
      next(err);
    }
  },
];
