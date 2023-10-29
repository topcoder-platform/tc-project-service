/**
 * API to get a form for particular revision
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
    revision: Joi.number().integer().positive().required(),
  },
};

module.exports = [
  validate(schema),
  permissions('form.view'),
  (req, res, next) => {
    util.fetchByIdFromES('forms', {
      query: {
        nested: {
          path: 'forms',
          query:
          {
            filtered: {
              filter: {
                bool: {
                  must: [
                    { term: { 'forms.key': req.params.key } },
                    { term: { 'forms.version': req.params.version } },
                    { term: { 'forms.revision': req.params.revision } },
                  ],
                },
              },
            },
          },
          inner_hits: {},
        },
      },
    }, 'metadata')
      .then((data) => {
        if (data.length === 0) {
          req.log.debug('No form found in ES');
          models.Form.findOne({
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

              res.json(form);
              return Promise.resolve();
            })
            .catch(next);
        } else {
          req.log.debug('forms found in ES');
          res.json(data[0].inner_hits.forms.hits.hits[0]._source); // eslint-disable-line no-underscore-dangle
        }
      })
      .catch(next);
  },
];
