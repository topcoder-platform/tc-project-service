/**
 * API to get a work
 */
import validate from 'express-validation';
import Joi from 'joi';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import models from '../../models';

const permissions = tcMiddleware.permissions;

const schema = {
  params: {
    projectId: Joi.number().integer().positive().required(),
    workStreamId: Joi.number().integer().positive().required(),
    id: Joi.number().integer().positive().required(),
  },
};

module.exports = [
  validate(schema),
  permissions('work.view'),
  (req, res, next) => models.PhaseWorkStream.findOne({
    where: {
      phaseId: req.params.id,
      workStreamId: req.params.workStreamId,
    },
  //  attributes: { exclude: ['deletedAt', 'deletedBy'] },
  })
    .then((work) => {
      // Not found
      if (!work) {
        const apiErr = new Error(`work not found for work stream id ${req.params.workStreamId}, ` +
          `project id ${req.params.projectId} and work id ${req.params.id}`);
        apiErr.status = 404;
        return Promise.reject(apiErr);
      }

      return models.ProjectPhase.findOne({
        where: {
          id: req.params.id,
          projectId: req.params.projectId,
        },
        attributes: { exclude: ['deletedAt', 'deletedBy'] },
      });
    })
    .then((phase) => {
      // Not found
      if (!phase) {
        const apiErr = new Error(`work not found for work stream id ${req.params.workStreamId}, ` +
          `project id ${req.params.projectId} and work id ${req.params.id}`);
        apiErr.status = 404;
        return Promise.reject(apiErr);
      }

      return res.json(phase);
    })
    .catch(next),
];
