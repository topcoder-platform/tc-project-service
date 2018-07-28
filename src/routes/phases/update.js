
import validate from 'express-validation';
import _ from 'lodash';
import Joi from 'joi';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import models from '../../models';
import util from '../../util';
import { EVENT } from '../../constants';


const permissions = tcMiddleware.permissions;

const updateProjectPhaseValidation = {
  body: {
    param: Joi.object().keys({
      name: Joi.string().optional(),
      status: Joi.string().optional(),
      startDate: Joi.date().optional(),
      endDate: Joi.date().optional(),
      duration: Joi.number().min(0).optional(),
      budget: Joi.number().min(0).optional(),
      spentBudget: Joi.number().min(0).optional(),
      progress: Joi.number().min(0).optional(),
      details: Joi.any().optional(),
    }).required(),
  },
};


module.exports = [
  // validate request payload
  validate(updateProjectPhaseValidation),
  // check permission
  permissions('project.updateProjectPhase'),

  (req, res, next) => {
    const projectId = _.parseInt(req.params.projectId);
    const phaseId = _.parseInt(req.params.phaseId);

    const updatedProps = req.body.param;
    updatedProps.updatedBy = req.authUser.userId;

    let previousValue;

    models.sequelize.transaction(() => models.ProjectPhase.findOne({
      where: {
        id: phaseId,
        projectId,
        deletedAt: { $eq: null },
      },
    }).then(existing => new Promise((accept, reject) => {
      if (!existing) {
        // handle 404
        const err = new Error('No active project phase found for project id ' +
          `${projectId} and phase id ${phaseId}`);
        err.status = 404;
        reject(err);
      } else {
        previousValue = _.clone(existing.get({ plain: true }));

        // make sure startDate < endDate
        let startDate;
        let endDate;
        if (updatedProps.startDate) {
          startDate = new Date(updatedProps.startDate);
        } else {
          startDate = existing.startDate !== null ? new Date(existing.startDate) : null;
        }

        if (updatedProps.endDate) {
          endDate = new Date(updatedProps.endDate);
        } else {
          endDate = existing.endDate !== null ? new Date(existing.endDate) : null;
        }

        if (startDate !== null && endDate !== null && startDate > endDate) {
          const err = new Error('startDate must not be after endDate.');
          err.status = 400;
          reject(err);
        } else {
          _.extend(existing, updatedProps);
          existing.save().then(accept).catch(reject);
        }
      }
    })))
    .then((updated) => {
      req.log.debug('updated project phase', JSON.stringify(updated, null, 2));

      // emit original and updated project phase information
      req.app.services.pubsub.publish(
        EVENT.ROUTING_KEY.PROJECT_PHASE_UPDATED,
        { original: previousValue, updated },
        { correlationId: req.id },
      );
      req.app.emit(EVENT.ROUTING_KEY.PROJECT_PHASE_UPDATED,
        { req, original: previousValue, updated });

      res.json(util.wrapResponse(req.id, updated));
    })
    .catch(err => next(err));
  },
];
