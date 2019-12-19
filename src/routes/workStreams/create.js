/**
 * API to add a work stream
 */
import validate from 'express-validation';
import _ from 'lodash';
import Joi from 'joi';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import util from '../../util';
import models from '../../models';
import { WORKSTREAM_STATUS } from '../../constants';

const permissions = tcMiddleware.permissions;

const schema = {
  params: {
    projectId: Joi.number().integer().positive().required(),
  },
  body: Joi.object().keys({
    name: Joi.string().max(255).required(),
    type: Joi.string().max(45).required(),
    status: Joi.string().valid(_.values(WORKSTREAM_STATUS)).required(),
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
  permissions('workStream.create'),
  // do the real work
  (req, res, next) => {
    const data = req.body;
    // default values
    const projectId = _.parseInt(req.params.projectId);
    _.assign(data, {
      projectId,
      createdBy: req.authUser.userId,
      updatedBy: req.authUser.userId,
    });

    models.sequelize.transaction(() => {
      req.log.debug('Create WorkStream - Starting transaction');
      return models.Project.findOne({
        where: { id: projectId, deletedAt: { $eq: null } },
      })
        .then((existingProject) => {
          if (!existingProject) {
            const err = new Error(`active project not found for project id ${projectId}`);
            err.status = 404;
            throw err;
          }

          return models.WorkStream.create(data);
        })
        .catch(next);
    })
      .then((createdEntity) => {
        req.log.debug('new work stream created (id# %d, name: %s)',
          createdEntity.id, createdEntity.name);
        res.status(201).json(_.omit(createdEntity.toJSON(), 'deletedBy', 'deletedAt'));
      })
      .catch((err) => {
        util.handleError('Error creating work stream', err, req, next);
      });
  },
];
