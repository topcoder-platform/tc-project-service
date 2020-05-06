/**
 * API to get revison list
 */
import validate from 'express-validation';
import Joi from 'joi';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import models from '../../../models';
import util from '../../../util';

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
  (req, res, next) =>
    util.fetchFromES('forms')
      .then((data) => {
        if (data.forms.length === 0) {
          req.log.debug('No form found in ES');
          models.Form.findAll({
            where: {
              key: req.params.key,
              version: req.params.version,
            },
            attributes: { exclude: ['deletedAt', 'deletedBy'] },
          }).then((forms) => {
            // Not found
            if ((!forms) || (forms.length === 0)) {
              const apiErr = new Error(`Form not found for key ${req.params.key} version ${req.params.version}`);
              apiErr.status = 404;
              return Promise.reject(apiErr);
            }

            res.json(forms);
            return Promise.resolve();
          })
            .catch(next);
        } else {
          req.log.debug('forms found in ES');
          res.json(data.forms);
        }
      }).catch(next),
];
