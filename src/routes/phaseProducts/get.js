
import _ from 'lodash';

import models from '../../models';
import util from '../../util';

const permissions = require('tc-core-library-js').middleware.permissions;

module.exports = [
  // check permission
  permissions('project.view'),

  (req, res, next) => {
    const projectId = _.parseInt(req.params.projectId);
    const phaseId = _.parseInt(req.params.phaseId);
    const productId = _.parseInt(req.params.productId);

    // Get project from ES
    return util.fetchByIdFromES('phaseProducts', {
      query: {
        nested: {
          path: 'phases',
          query:
          {
            filtered: {
              filter: {
                bool: {
                  must: [
                    { term: { 'phases.id': phaseId } },
                    { term: { 'phases.projectId': projectId } },
                  ],
                },
              },
            },
          },
          inner_hits: {},
        },
      },
    })
      .then((data) => {
        if (data.length === 0) {
          req.log.debug('No phase product found in ES');
          return models.PhaseProduct.findOne({
            where: {
              id: productId,
              projectId,
              phaseId,
            },
          }).then((product) => {
            if (!product) {
              // handle 404
              const err = new Error('phase product not found for project id ' +
                    `${projectId}, phase id ${phaseId} and product id ${productId}`);
              err.status = 404;
              throw err;
            } else {
              res.json(product);
            }
          }).catch(err => next(err));
        }
        req.log.debug('phase product found in ES');
        // Get the phases
        const phases = data[0].inner_hits.phases.hits.hits[0]._source; // eslint-disable-line no-underscore-dangle
        const product = _.isArray(phases.products) ? _.find(phases.products, p => p.id === productId) : {};
        if (!product) {
          // handle 404
          const err = new Error('phase product not found for project id ' +
                  `${projectId}, phase id ${phaseId} and product id ${productId}`);
          err.status = 404;
          throw err;
        }

        return res.json(product);
      })
      .catch(err => next(err));
  },
];
