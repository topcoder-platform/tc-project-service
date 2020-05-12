/**
 * API to get a project type
 */
import validate from 'express-validation';
import Joi from 'joi';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import models from '../../models';
import util from '../../util';

const permissions = tcMiddleware.permissions;

const schema = {
  params: {
    key: Joi.string().max(45).required(),
  },
};

module.exports = [
  validate(schema),
  permissions('projectType.view'),
  (req, res, next) => {
    util.fetchByIdFromES('projectTypes', {
      query: {
        nested: {
          path: 'projectTypes',
          query: {
            match: { 'projectTypes.key': req.params.key },
          },
          inner_hits: {},
        },
      },
    }, 'metadata')
      .then((data) => {
        if (data.length === 0) {
          req.log.debug('No projectType found in ES');
          models.ProjectType.findOne({
            where: {
              key: req.params.key,
            },
            attributes: { exclude: ['deletedAt', 'deletedBy'] },
          })
            .then((projectType) => {
            // Not found
              if (!projectType) {
                const apiErr = new Error(`Project type not found for key ${req.params.key}`);
                apiErr.status = 404;
                return Promise.reject(apiErr);
              }

              res.json(projectType);
              return Promise.resolve();
            })
            .catch(next);
        } else {
          req.log.debug('projectTypes found in ES');
          res.json(data[0].inner_hits.projectTypes.hits.hits[0]._source); // eslint-disable-line no-underscore-dangle
        }
      })
      .catch(next);
  },

];
