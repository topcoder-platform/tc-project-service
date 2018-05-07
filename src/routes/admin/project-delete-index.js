
/* globals Promise */

import _ from 'lodash';
import config from 'config';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import util from '../../util';

/**
/**
 * API to handle retrieving a single project by id
 *
 * Permissions:
 * Only users that have access to the project can retrieve it.
 *
 */

// var permissions = require('tc-core-library-js').middleware.permissions
const permissions = tcMiddleware.permissions;
const ES_PROJECT_INDEX = config.get('elasticsearchConfig.indexName');
// const ES_PROJECT_TYPE = config.get('elasticsearchConfig.docType');

module.exports = [
  permissions('project.admin'),
  /**
   * GET projects/{projectId}
   * Get a project by id
   */
  (req, res, next) => { // eslint-disable-line no-unused-vars
    const logger = req.log;
    logger.debug('Entered Admin#deleteIndex');
    const indexName = _.get(req, 'body.param.indexName', ES_PROJECT_INDEX);
    // const docType = _.get(req, 'body.param.docType', ES_PROJECT_TYPE);
    logger.debug('indexName', indexName);
    // logger.debug('docType', docType);

    const esClient = util.getElasticSearchClient();
    esClient.indices.delete({
      index: indexName,
      // we would want to ignore no such index error
      ignore: [404],
    });
    res.status(200).json(util.wrapResponse(req.id, { message: 'Delete index request successfully submitted' }));
  },
];
