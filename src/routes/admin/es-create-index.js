/**
 * Admin endpoint to create ES index.
 *
 * Waits until the operation is completed and returns result.
 */
import _ from 'lodash';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import util from '../../util';
import esUtils from '../../utils/es';
import { INDEX_TO_DOC_TYPE } from '../../utils/es-config';

const permissions = tcMiddleware.permissions;

module.exports = [
  permissions('project.admin'),
  (req, res, next) => {
    try {
      const logger = req.log;
      logger.debug('Entered Admin#createIndex');

      const indexName = _.get(req, 'body.indexName');
      if (!indexName) {
        const apiErr = new Error('"indexName" is required.');
        apiErr.status = 400;
        throw apiErr;
      }

      const docType = _.get(req, 'body.param.docType', INDEX_TO_DOC_TYPE[indexName]);
      if (!docType) {
        const apiErr = new Error('Cannot find "docType" for the index.');
        apiErr.status = 500;
        throw apiErr;
      }

      logger.debug('indexName', indexName);
      logger.debug('docType', docType);


      const esClient = util.getElasticSearchClient();
      esClient.indices.create(esUtils.buildCreateIndexRequest(indexName, docType))
        .then(() => {
          res.status(200).json({ message: 'Index successfully created.' });
        })
        .catch(next);
    } catch (err) {
      next(err);
    }
  },
];
