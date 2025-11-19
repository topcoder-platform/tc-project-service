/**
 * API to get a form list
 */
import validate from 'express-validation';
import Joi from 'joi';
import { middleware as tcMiddleware } from 'tc-core-library-js';
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
    models.Form.findAll({
      where: {
        key: req.params.key,
      },
      attributes: { exclude: ['deletedAt', 'deletedBy'] },
      raw: true,
    })
      .then((forms) => {
        if (!forms || forms.length === 0) {
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
      .catch(next),
];
