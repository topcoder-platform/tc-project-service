/**
 * API to get a list of work items
 */
import validate from 'express-validation';
import _ from 'lodash';
import Joi from 'joi';
import models from '../../models';

const permissions = require('tc-core-library-js').middleware.permissions;

const schema = {
  params: {
    projectId: Joi.number().integer().positive().required(),
    workStreamId: Joi.number().integer().positive().required(),
    workId: Joi.number().integer().positive().required(),
  },
};

module.exports = [
  // validate request payload
  validate(schema),
  // check permission
  permissions('workItem.view'),

  (req, res, next) => {
    const projectId = _.parseInt(req.params.projectId);
    const workStreamId = _.parseInt(req.params.workStreamId);
    const phaseId = _.parseInt(req.params.workId);

    models.ProjectPhase.findOne({
      where: {
        id: phaseId,
        projectId,
      },
      include: [{
        model: models.WorkStream,
        where: {
          id: workStreamId,
          projectId,
        },
      },
      ],
    })
      .then((existing) => {
        if (!existing) {
          // handle 404
          const err = new Error('No active phase product found for project id ' +
              `${projectId}, work stream id ${workStreamId} and phase id ${phaseId}`);
          err.status = 404;
          throw err;
        }

        return models.PhaseProduct.findAll({
          where: {
            phaseId,
            projectId,
          },
        });
      })
      .then(products => res.json(products))
      .catch(err => next(err));
  },
];
