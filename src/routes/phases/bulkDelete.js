import validate from 'express-validation';
import _ from 'lodash';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import Joi from 'joi';
import models from '../../models';
import util from '../../util';
import { EVENT, RESOURCES } from '../../constants';

const permissions = tcMiddleware.permissions;

const bulkDeletePhaseValidation = {
  body: Joi.object().keys({
    phaseIds: Joi.array().items(Joi.number().integer()).required(),
  }).required(),
};

module.exports = [
  // validate request payload
  validate(bulkDeletePhaseValidation),
  // check permission
  permissions('project.deleteProjectPhase'),

  (req, res, next) => {
    const data = req.body;
    const projectId = _.parseInt(req.params.projectId);

    models.sequelize.transaction(transaction =>
      // soft delete the record
      models.ProjectPhase.findAll({
        where: {
          id: data.phaseIds,
          projectId,
          deletedAt: { $eq: null },
        },
        raw: true,
        transaction,
      }).then((phases) => {
        const notFoundPhases = _.differenceWith(data.phaseIds, phases, (a, b) => a === b.id);
        if (!_.isEmpty(notFoundPhases)) {
          // handle 404
          const err = new Error('no active project phase found for project id ' +
            `${projectId} and phase ids ${notFoundPhases}`);
          err.status = 404;
          return Promise.reject(err);
        }
        return models.ProjectPhase.update({ deletedBy: req.authUser.userId }, {
          where: {
            id: data.phaseIds,
            projectId,
          },
          transaction,
        }).then(() =>
          models.ProjectPhase.destroy({
            where: {
              id: data.phaseIds,
              projectId,
            },
            transaction,
          }),
        );
      }))
      .then((deletedCount) => {
        const result = {
          id: data.phaseIds,
          projectId,
        };
        req.log.debug('deleted project phases', JSON.stringify(result, null, 2));
        if (deletedCount > 0) {
          util.sendResourceToKafkaBus(
            req,
            EVENT.ROUTING_KEY.PROJECT_PHASE_REMOVED,
            RESOURCES.PHASE,
            result,
          );
        }
        res.status(204).json({});
      }).catch(err => next(err));
  },
];
