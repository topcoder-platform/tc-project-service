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
    const createdBy = _.parseInt(req.authUser.userId);
    const updatedBy = _.parseInt(req.authUser.userId);
    const newPhaseMembers = req.body.userIds;
    const transaction = await models.sequelize.transaction();
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
      const projectMembers = _.map(await models.ProjectMember.getActiveProjectMembers(projectId), 'userId');
      const notProjectMembers = _.difference(newPhaseMembers, projectMembers);
      if (notProjectMembers.length > 0) {
        const err = new Error(`Members with id: ${notProjectMembers} are not members of project ${projectId}`);
        err.status = 404;
        throw (err);
      }
      const phaseMembers = await models.ProjectPhaseMember.getPhaseMembers(phaseId);
      const existentPhaseMembers = _.map(phaseMembers, 'userId');
      let updatedPhaseMembers = _.cloneDeep(phaseMembers);
      const updatedPhase = _.cloneDeep(phase);
      const membersToAdd = _.difference(newPhaseMembers, existentPhaseMembers);
      const membersToRemove = _.differenceBy(existentPhaseMembers, newPhaseMembers);
      if (membersToRemove.length > 0) {
        await models.ProjectPhaseMember.destroy({ where: { phaseId, userId: membersToRemove }, transaction });
        updatedPhaseMembers = _.filter(updatedPhaseMembers, row => !_.includes(membersToRemove, row.userId));
      }
      if (membersToAdd.length > 0) {
        const createData = _.map(membersToAdd, userId => ({ phaseId, userId, createdBy, updatedBy }));
        const result = await models.ProjectPhaseMember.bulkCreate(createData, { transaction });
        updatedPhaseMembers.push(..._.map(result, item => item.toJSON()));
      }
      req.log.debug('updated phase members', JSON.stringify(newPhaseMembers, null, 2));
      //  emit event
      if (membersToRemove.length > 0 || membersToAdd.length > 0) {
        util.sendResourceToKafkaBus(
          req,
          EVENT.ROUTING_KEY.PROJECT_PHASE_UPDATED,
          RESOURCES.PHASE,
          _.assign(updatedPhase, { members: updatedPhaseMembers }),
          _.assign(phase, { members: phaseMembers }),
          ROUTES.PHASES.UPDATE);
      }
      await transaction.commit();
      res.json(updatedPhaseMembers);
    } catch (err) {
      await transaction.rollback();
      next(err);
    }
  },
];
