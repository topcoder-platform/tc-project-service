/**
 * API to get a form for particular revision
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
    version: Joi.number().integer().positive().required(),
    revision: Joi.number().integer().positive().required(),
  },
};

module.exports = [
  validate(schema),
  permissions('form.view'),
  (req, res, next) => models.Form.findOne({
    where: {
      key: req.params.key,
      version: req.params.version,
      revision: req.params.revision,
    },
    attributes: { exclude: ['deletedAt', 'deletedBy'] },
  })
    .then((form) => {
      // Not found
      if (!form) {
        const apiErr = new Error('Form not found for key' +
          ` ${req.params.key} version ${req.params.version} revision ${req.params.revision}`);
        apiErr.status = 404;
        return Promise.reject(apiErr);
      }

      res.json(util.wrapResponse(req.id, form));
      return Promise.resolve();
    })
    .catch(next),
];
