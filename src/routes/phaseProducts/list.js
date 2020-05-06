
import _ from 'lodash';
import util from '../../util';
import models from '../../models';

const permissions = require('tc-core-library-js').middleware.permissions;

const retrieveFromDB = async (req, res, next) => {
  const projectId = _.parseInt(req.params.projectId);
  const phaseId = _.parseInt(req.params.phaseId);

  // check if the project and phase are exist
  return models.ProjectPhase.findOne({
    where: { id: phaseId, projectId },
    raw: true,
  }).then((countPhase) => {
    if (!countPhase) {
      const apiErr = new Error('project phase not found for project id ' +
                `${projectId} and phase id ${phaseId}`);
      apiErr.status = 404;
      throw apiErr;
    }

    const parameters = {
      projectId,
      phaseId,
    };

    return models.PhaseProduct.search(parameters, req.log)
      .then(({ rows }) => res.json(rows));
  })
    .catch(err => next(err));
};

module.exports = [
  // check permission
  permissions('project.view'),

  (req, res, next) => {
    const projectId = _.parseInt(req.params.projectId);
    const phaseId = _.parseInt(req.params.phaseId);

    // Get project from ES
    util.fetchByIdFromES('phaseProducts', {
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
          return retrieveFromDB(req, res, next);
        }
        req.log.debug('phase product found in ES');
        // Get the phases
        const phases = data[0].inner_hits.phases.hits.hits[0]._source; // eslint-disable-line no-underscore-dangle
        const products = _.isArray(phases.products) ? phases.products : [];
        return res.json(products);
      })
      .catch(err => next(err));
  },
];
