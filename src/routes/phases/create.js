import validate from 'express-validation';
import _ from 'lodash';
import Joi from 'joi';

import models from '../../models';
import util from '../../util';
import { EVENT } from '../../constants';

const permissions = require('tc-core-library-js').middleware.permissions;


const addProjectPhaseValidations = {
  body: {
    param: Joi.object().keys({
      name: Joi.string().required(),
      status: Joi.string().required(),
      startDate: Joi.date().max(Joi.ref('endDate')).required(),
      endDate: Joi.date().required(),
      budget: Joi.number().positive().optional(),
      progress: Joi.number().positive().optional(),
      details: Joi.any().optional(),
    }).required(),
  },
};

module.exports = [
  // validate request payload
  validate(addProjectPhaseValidations),
  // check permission
  permissions('project.addProjectPhase'),
  // do the real work
  (req, res, next) => {
    const data = req.body.param;
    // default values
    const projectId = _.parseInt(req.params.projectId);
    _.assign(data, {
      projectId,
      createdBy: req.authUser.userId,
      updatedBy: req.authUser.userId,
    });

    models.sequelize.transaction(() => {
      let newProjectPhase = null;

      models.Project.findOne({
        where: { id: projectId, deletedAt: { $eq: null } },
      }).then((existingProject) => {
        if (!existingProject) {
          const err = new Error(`active project not found for project id ${projectId}`);
          err.status = 404;
          throw err;
        }
        models.ProjectPhase
          .create(data)
          .then((_newProjectPhase) => {
            newProjectPhase = _.cloneDeep(_newProjectPhase);
            req.log.debug('new project phase created (id# %d, name: %s)',
                  newProjectPhase.id, newProjectPhase.name);

            newProjectPhase = newProjectPhase.get({ plain: true });
            newProjectPhase = _.omit(newProjectPhase, ['deletedAt', 'deletedBy', 'utm']);

            // Send events to buses
            req.log.debug('Sending event to RabbitMQ bus for project phase %d', newProjectPhase.id);
            req.app.services.pubsub.publish(EVENT.ROUTING_KEY.PROJECT_PHASE_ADDED,
              newProjectPhase,
              { correlationId: req.id },
            );
            req.log.debug('Sending event to Kafka bus for project phase %d', newProjectPhase.id);
            req.app.emit(EVENT.ROUTING_KEY.PROJECT_PHASE_ADDED, { req, created: newProjectPhase });

            res.status(201).json(util.wrapResponse(req.id, newProjectPhase, 1, 201));
          });
      }).catch((err) => {
        util.handleError('Error creating project phase', err, req, next);
      });
    });
  },

];
