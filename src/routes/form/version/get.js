/**
 * API to get a latest version for key
 *
 */
import validate from 'express-validation';
import Joi from 'joi';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import util from '../../../util';
import models from '../../../models';

const permissions = tcMiddleware.permissions;

const schema = {
  params: {
    key: Joi.string().max(45).required(),
  },
};

module.exports = [
  validate(schema),
  permissions('form.view'),
  (req, res, next) =>
    models.Form.latestRevisionofLatestVersion(req.params.key)
      .then((form) => {
        if (form == null) {
          const apiErr = new Error(`Form not found for key ${req.params.key} version ${req.params.version}`);
          apiErr.status = 404;
          return Promise.reject(apiErr);
        }
        res.json(util.wrapResponse(req.id, form));
        return Promise.resolve();
      })
    .catch(next),
];
