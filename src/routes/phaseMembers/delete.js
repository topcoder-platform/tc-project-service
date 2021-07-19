import _ from 'lodash';
import Joi from 'joi';
import validate from 'express-validation';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import models from '../../models';
import util from '../../util';
import { EVENT, RESOURCES, ROUTES } from '../../constants';

/**
 * API to update a project phase members.
 */
const permissions = tcMiddleware.permissions;

const deletePhaseMemberValidations = {
  params: {
    projectId: Joi.number().integer().positive().required(),
    phaseId: Joi.number().integer().positive().required(),
    userId: Joi.number().integer().positive().required(),
  },
};

module.exports = [
  // handles request validations
  validate(deletePhaseMemberValidations),
  permissions('phaseMember.delete'),
  async (req, res, next) => {
    const projectId = _.parseInt(req.params.projectId);
    const phaseId = _.parseInt(req.params.phaseId);
    const userId = _.parseInt(req.params.userId);
    let transaction;
    try {
      // check if project and phase exist
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
      // get current phase members.
      const phaseMembers = await models.ProjectPhaseMember.getPhaseMembers(phaseId);
      // find out which is to be deleted
      const memberToDelete = _.find(phaseMembers, ['userId', userId]);
      if (memberToDelete) {
        transaction = await models.sequelize.transaction();
        const phaseMember = await models.ProjectPhaseMember.findOne({
          where: {
            phaseId,
            userId,
            deletedAt: { $eq: null },
          },
        });
        await phaseMember.update({ deletedBy: req.authUser.userId }, { transaction });
        await phaseMember.destroy({ transaction });
        const updatedPhase = _.cloneDeep(phase);
        util.sendResourceToKafkaBus(
          req,
          EVENT.ROUTING_KEY.PROJECT_PHASE_UPDATED,
          RESOURCES.PHASE,
          _.assign(updatedPhase, { members: _.filter(phaseMembers, member => member.userId !== userId) }),
          _.assign(phase, { members: phaseMembers }),
          ROUTES.PHASES.UPDATE);
        await transaction.commit();
      }
      res.status(204).end();
    } catch (err) {
      if (transaction) {
        await transaction.rollback();
      }
      next(err);
    }
  },
];
