
import _ from 'lodash';
import config from 'config';
import util from '../../util';

const ES_PROJECT_INDEX = config.get('elasticsearchConfig.indexName');
const ES_PROJECT_TYPE = config.get('elasticsearchConfig.docType');

const eClient = util.getElasticSearchClient();

const permissions = require('tc-core-library-js').middleware.permissions;

module.exports = [
  // check permission
  permissions('project.view'),

  (req, res, next) => {
    const projectId = _.parseInt(req.params.projectId);
    const phaseId = _.parseInt(req.params.phaseId);

    // Get project from ES
    eClient.get({ index: ES_PROJECT_INDEX, type: ES_PROJECT_TYPE, id: req.params.projectId })
      .then((doc) => {
        if (!doc) {
          const err = new Error(`active project not found for project id ${projectId}`);
          err.status = 404;
          throw err;
        }

        // Get the phases
        let phases = _.isArray(doc._source.phases) ? doc._source.phases : []; // eslint-disable-line no-underscore-dangle

        // Get the phase by id
        phases = _.filter(phases, { id: phaseId });
        if (phases.length <= 0) {
          const err = new Error(`active project phase not found for phase id ${phaseId}`);
          err.status = 404;
          throw err;
        }

        // Get the products
        let products = phases[0].products;
        products = _.isArray(products) ? products : []; // eslint-disable-line no-underscore-dangle

        res.json(util.wrapResponse(req.id, products, products.length));
      })
      .catch(err => next(err));
  },
];
