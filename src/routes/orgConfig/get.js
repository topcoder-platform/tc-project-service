/**
 * API to get a organization config
 */
import validate from 'express-validation';
import Joi from 'joi';
import { middleware as tcMiddleware } from 'tc-core-library-js';
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
  permissions('orgConfig.view'),
  (req, res, next) => models.OrgConfig.findOne({
    where: {
      id: req.params.id,
    },
    attributes: { exclude: ['deletedAt', 'deletedBy'] },
  })
    .then((orgConfig) => {
      // Not found
      if (!orgConfig) {
        const apiErr = new Error(`Organization config not found for id ${req.params.id}`);
        apiErr.status = 404;
        return Promise.reject(apiErr);
      }

      res.json(util.wrapResponse(req.id, orgConfig));
      return Promise.resolve();
    })
    .catch(next),
];
