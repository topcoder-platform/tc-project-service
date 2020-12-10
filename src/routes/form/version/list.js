/**
 * API to get a form list
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
            },
            attributes: { exclude: ['deletedAt', 'deletedBy'] },
          })
            .then((forms) => {
              // Not found
              if ((!forms) || (forms.length === 0)) {
                const apiErr = new Error(`Form not found for key ${req.params.key}`);
                apiErr.status = 404;
                return Promise.reject(apiErr);
              }

              const latestForms = {};
              forms.forEach((element) => {
                const isNewerRevision = (latestForms[element.version] != null) &&
              (latestForms[element.version].revision < element.revision);
                if ((latestForms[element.version] == null) || isNewerRevision) {
                  latestForms[element.version] = element;
                }
              });
              res.json(Object.values(latestForms));
              return Promise.resolve();
            })
            .catch(next);
        } else {
          req.log.debug('forms found in ES');
          res.json(data.forms);
        }
      }).catch(next),
];
