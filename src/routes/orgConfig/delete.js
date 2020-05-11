/**
 * API to delete a organization config
 */
import validate from 'express-validation';
import _ from 'lodash';
import Joi from 'joi';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import { EVENT, RESOURCES } from '../../constants';
import util from '../../util';
import models from '../../models';

const permissions = tcMiddleware.permissions;

const schema = {
  params: {
    id: Joi.number().integer().positive().required(),
  },
};

module.exports = [
  validate(schema),
  permissions('orgConfig.delete'),
  (req, res, next) =>
    models.sequelize.transaction(() =>
      models.OrgConfig.findByPk(req.params.id)
        .then((entity) => {
          if (!entity) {
            const apiErr = new Error(`Organization config not found for id ${req.params.id}`);
            apiErr.status = 404;
            return Promise.reject(apiErr);
          }
          // Update the deletedBy, then delete
          return entity.update({ deletedBy: req.authUser.userId });
        })
        .then(entity => entity.destroy()))
      .then((entity) => {
        util.sendResourceToKafkaBus(req,
          EVENT.ROUTING_KEY.PROJECT_METADATA_DELETE,
          RESOURCES.ORG_CONFIG,
          _.pick(entity.toJSON(), 'id'));
        res.status(204).end();
      })
      .catch(next),
];
