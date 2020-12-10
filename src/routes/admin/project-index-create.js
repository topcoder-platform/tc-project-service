import _ from 'lodash';
import config from 'config';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import { indexProjectsRange } from '../../utils/es';

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
const ES_PROJECT_TYPE = config.get('elasticsearchConfig.docType');

module.exports = [
  permissions('project.admin'),
  /*
   * handles request of indexing projects
   */
  (req, res, next) => {
    const logger = req.log;
    logger.debug('Entered Admin#index');
    const projectIdStart = Number(req.body.projectIdStart);
    const projectIdEnd = Number(req.body.projectIdEnd);
    const indexName = _.get(req, 'body.indexName', ES_PROJECT_INDEX);
    const docType = _.get(req, 'body.docType', ES_PROJECT_TYPE);
    const fields = req.query.fields;
    const id = req.id;
    return indexProjectsRange(
      {
        logger,
        projectIdStart,
        projectIdEnd,
        indexName,
        docType,
        fields,
        id,
      },
      (esIndexingBody) => {
        res.status(200).json({
          message: `Reindex request successfully submitted for ${
            esIndexingBody.length / 2
          } projects`,
        });
      },
    ).then((result) => {
      logger.debug(`project indexed successfully (projectId: ${projectIdStart}-${projectIdEnd})`, result);
      logger.debug(result);
    }).catch((error) => {
      logger.error(
        `Error in getting project details for indexing (projectId: ${projectIdStart}-${projectIdEnd})`,
        error);
      next(error);
    });
  },
];
