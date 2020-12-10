/**
 * API to get a work item
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
    id: Joi.number().integer().positive().required(),
  },
};

module.exports = [
  validate(schema),
  // check permission
  permissions('workItem.view'),

  (req, res, next) => {
    const projectId = _.parseInt(req.params.projectId);
    const workStreamId = _.parseInt(req.params.workStreamId);
    const phaseId = _.parseInt(req.params.workId);
    const productId = _.parseInt(req.params.id);

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
          const err = new Error('No active work item found for project id ' +
          `${projectId}, phase id ${phaseId} and work stream id ${workStreamId}`);
          err.status = 404;
          return Promise.reject(err);
        }

        return models.PhaseProduct.findOne({
          where: {
            id: productId,
            projectId,
            phaseId,
            deletedAt: { $eq: null },
          },
        });
      }).then((product) => {
        if (!product) {
        // handle 404
          const err = new Error('phase product not found for project id ' +
              `${projectId}, phase id ${phaseId} and product id ${productId}`);
          err.status = 404;
          throw err;
        } else {
          res.json(product);
        }
      }).catch(err => next(err));
  },
];
