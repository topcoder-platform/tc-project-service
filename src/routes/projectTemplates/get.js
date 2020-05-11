/**
 * API to get a project template
 */
import validate from 'express-validation';
import Joi from 'joi';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import models from '../../models';
import util from '../../util';

const permissions = tcMiddleware.permissions;

const schema = {
  params: {
    templateId: Joi.number().integer().positive().required(),
  },
};

module.exports = [
  validate(schema),
  permissions('projectTemplate.view'),
  (req, res, next) => {
    util.fetchByIdFromES('projectTemplates', {
      query: {
        nested: {
          path: 'projectTemplates',
          query: {
            match: { 'projectTemplates.id': req.params.templateId },
          },
          inner_hits: {},
        },
      },
    }, 'metadata')
      .then((data) => {
        if (data.length === 0) {
          req.log.debug('No projectTemplate found in ES');
          models.ProjectTemplate.findOne({
            where: {
              deletedAt: { $eq: null },
              id: req.params.templateId,
            },
            attributes: { exclude: ['deletedAt', 'deletedBy'] },
            raw: true,
          })
            .then((projectTemplate) => {
              // Not found
              if (!projectTemplate) {
                const apiErr = new Error(`Project template not found for project id ${req.params.templateId}`);
                apiErr.status = 404;
                return Promise.reject(apiErr);
              }

              res.json(projectTemplate);
              return Promise.resolve();
            })
            .catch(next);
        } else {
          req.log.debug('projectTemplate found in ES');
          res.json(data[0].inner_hits.projectTemplates.hits.hits[0]._source); // eslint-disable-line no-underscore-dangle
        }
      })
      .catch(next);
  },
];
