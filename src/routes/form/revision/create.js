/**
 * API to add a form revision
 */
import validate from 'express-validation';
import _ from 'lodash';
import Joi from 'joi';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import util from '../../../util';
import models from '../../../models';

const permissions = tcMiddleware.permissions;

const schema = {
  params: {
    key: Joi.string().max(45).required(),
    version: Joi.number().integer().positive().required(),
  },
  body: {
    param: Joi.object().keys({
      config: Joi.object().required(),

      createdAt: Joi.any().strip(),
      updatedAt: Joi.any().strip(),
      deletedAt: Joi.any().strip(),
      createdBy: Joi.any().strip(),
      updatedBy: Joi.any().strip(),
      deletedBy: Joi.any().strip(),
    }).required(),
  },
};

module.exports = [
  validate(schema),
  permissions('form.create'),
  (req, res, next) => {
    models.sequelize.transaction(() => models.Form.findOne({
      where: {
        key: req.params.key,
        version: req.params.version,
      },
      order: [['revision', 'DESC']],
    }).then((form) => {
      if (form) {
        const version = form ? form.version : 1;
        const revision = form ? form.revision + 1 : 1;
        const entity = _.assign(req.body.param, {
          version,
          revision,
          createdBy: req.authUser.userId,
          updatedBy: req.authUser.userId,
          key: req.params.key,
          config: req.body.param.config,
        });
        return models.Form.create(entity);
      }
      const apiErr = new Error(`Form not exists for key ${req.params.key} version ${req.params.version}`);
      apiErr.status = 404;
      return Promise.reject(apiErr);
    }).then((createdEntity) => {
        // Omit deletedAt, deletedBy
      res.status(201).json(util.wrapResponse(
          req.id, _.omit(createdEntity.toJSON(), 'deletedAt', 'deletedBy'), 1, 201));
    })
      .catch(next));
  },
];
