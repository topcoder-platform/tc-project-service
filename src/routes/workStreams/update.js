/**
 * API to update a work stream
 */
import validate from 'express-validation';
import _ from 'lodash';
import Joi from 'joi';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import models from '../../models';
import { WORKSTREAM_STATUS } from '../../constants';

const permissions = tcMiddleware.permissions;

const schema = {
  params: {
    projectId: Joi.number().integer().positive().required(),
    id: Joi.number().integer().positive().required(),
  },
  body: Joi.object().keys({
    id: Joi.number().valid(Joi.ref('$params.id')),
    name: Joi.string().max(255),
    type: Joi.string().max(45),
    status: Joi.string().valid(_.values(WORKSTREAM_STATUS)),
    createdAt: Joi.any().strip(),
    updatedAt: Joi.any().strip(),
    deletedAt: Joi.any().strip(),
    createdBy: Joi.any().strip(),
    updatedBy: Joi.any().strip(),
    deletedBy: Joi.any().strip(),
  }).required(),
};

module.exports = [
  validate(schema),
  permissions('workStream.edit'),
  (req, res, next) => {
    const entityToUpdate = _.assign(req.body, {
      updatedBy: req.authUser.userId,
    });
    const projectId = req.params.projectId;
    const workStreamId = req.params.id;

    return models.WorkStream.findOne({
      where: {
        id: workStreamId,
        projectId,
      },
    })
      .then((workStream) => {
        if (!workStream) {
        // handle 404
          const err = new Error(`work stream not found for project id ${projectId} ` +
          `and work stream id ${workStreamId}`);
          err.status = 404;
          return Promise.reject(err);
        }

        return workStream.update(entityToUpdate);
      })
      .then((workStream) => {
        res.json(workStream);
        return Promise.resolve();
      })
      .catch(next);
  },
];
