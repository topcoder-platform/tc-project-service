/**
 * API to get a form for particular version
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
  (req, res, next) => models.Form.findOne({
    where: {
      key: req.params.key,
      version: req.params.version,
    },
    order: [['revision', 'DESC']],
    limit: 1,
    attributes: { exclude: ['deletedAt', 'deletedBy'] },
  })
    .then((form) => {
      // Not found
      if (!form) {
        const apiErr = new Error(`Form not found for key ${req.params.key} version ${req.params.version}`);
        apiErr.status = 404;
        return Promise.reject(apiErr);
      }
      res.json(util.wrapResponse(req.id, form));
      return Promise.resolve();
    })
    .catch(next),
];
