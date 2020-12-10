/**
 * API to add a project type
 */
import validate from 'express-validation';
import _ from 'lodash';
import Joi from 'joi';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import { EVENT, RESOURCES } from '../../../constants';
import util from '../../../util';
import models from '../../../models';

const permissions = tcMiddleware.permissions;

const schema = {
  params: {
    version: Joi.number().integer().positive().required(),
    key: Joi.string().max(45).required(),
  },
};

module.exports = [
  validate(schema),
  permissions('form.create'),
  (req, res, next) => {
    models.sequelize.transaction(() => models.Form.findAll(
      {
        where: {
          key: req.params.key,
          version: req.params.version,
        },
      }).then((allRevision) => {
      if (allRevision.length === 0) {
        const apiErr = new Error(`Form not found for key ${req.params.key} version ${req.params.version}`);
        apiErr.status = 404;
        return Promise.reject(apiErr);
      }
      return models.Form.update(
        {
          deletedBy: req.authUser.userId,
        }, {
          where: {
            key: req.params.key,
            version: req.params.version,
          },
        });
    })
      .then(() => models.Form.destroy({
        where: {
          key: req.params.key,
          version: req.params.version,
        },
      })).then(deleted => models.Form.findAll({
        where: {
          key: req.params.key,
          version: req.params.version,
        },
        paranoid: false,
        order: [['deletedAt', 'DESC']],
        limit: deleted,
      }))
      .then((forms) => {
        _.map(forms, form => util.sendResourceToKafkaBus(req,
          EVENT.ROUTING_KEY.PROJECT_METADATA_DELETE,
          RESOURCES.FORM_VERSION,
          _.pick(form.toJSON(), 'id')));
        res.status(204).end();
      })
      .catch(next));
  },
];
