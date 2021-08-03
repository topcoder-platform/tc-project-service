import _ from 'lodash';
import Joi from 'joi';
import validate from 'express-validation';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import models from '../../models';
import util from '../../util';
import { EVENT, RESOURCES, ROUTES } from '../../constants';

/**
 * API to create a project phase approval.
 */
const permissions = tcMiddleware.permissions;

const createPhaseApprovalValidations = {
  body: Joi.object().keys({
    decision: Joi.string().valid('approve', 'reject').required(),
    comment: Joi.string().trim().max(255).required(),
    startDate: Joi.date().required(),
    endDate: Joi.date().min(Joi.ref('startDate')).optional(),
    expectedEndDate: Joi.date().min(Joi.ref('startDate')).required(),
  }),
  params: {
    projectId: Joi.number().integer().positive().required(),
    phaseId: Joi.number().integer().positive().required(),
  },
};

module.exports = [
  // handles request validations
  validate(createPhaseApprovalValidations),
  permissions('phaseApproval.create'),
  async (req, res, next) => {
    const projectId = _.parseInt(req.params.projectId);
    const phaseId = _.parseInt(req.params.phaseId);
    const approvalData = req.body;
    const createdBy = _.parseInt(req.authUser.userId);
    const updatedBy = _.parseInt(req.authUser.userId);
    _.assign(approvalData, { phaseId, createdBy, updatedBy });
    try {
      // check if project and phase exist
      const phase = await models.ProjectPhase.findOne({
        where: {
          id: phaseId,
          projectId,
        },
        include: [{
          model: models.ProjectPhaseApproval,
          as: 'approvals',
        }],
      });
      if (!phase) {
        const err = new Error('No active project phase found for project id ' +
          `${projectId} and phase id ${phaseId}`);
        err.status = 404;
        throw (err);
      }
      const phaseApproval = (await models.ProjectPhaseApproval.create(approvalData)).toJSON();
      req.log.debug('created phase approval', JSON.stringify(phaseApproval, null, 2));
      const updatedPhase = _.cloneDeep(phase.toJSON());
      const approvals = _.isArray(updatedPhase.approvals) ? updatedPhase.approvals : [];
      approvals.push(phaseApproval);
      _.assign(updatedPhase, { approvals });
      //  emit event
      util.sendResourceToKafkaBus(
        req,
        EVENT.ROUTING_KEY.PROJECT_PHASE_UPDATED,
        RESOURCES.PHASE,
        updatedPhase,
        phase.toJSON(),
        ROUTES.PHASES.UPDATE);
      res.json(phaseApproval);
    } catch (err) {
      next(err);
    }
  },
];
