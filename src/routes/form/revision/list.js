/**
 * API to get revison list
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
  },
};

module.exports = [
  validate(schema),
  permissions('form.view'),
  (req, res, next) => models.Form.findAll({
    where: {
      key: req.params.key,
      version: req.params.version,
    },
    attributes: { exclude: ['deletedAt', 'deletedBy'] },
  })
    .then((forms) => {
      // Not found
      if ((!forms) || (forms.length === 0)) {
        const apiErr = new Error(`Form not found for key ${req.params.key} version ${req.params.version}`);
        apiErr.status = 404;
        return Promise.reject(apiErr);
      }

      res.json(util.wrapResponse(req.id, forms));
      return Promise.resolve();
    })
    .catch(next),
];
