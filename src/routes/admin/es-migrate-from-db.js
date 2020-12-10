/**
 * Admin endpoint migrate data from DB to ES index.
 *
 * Waits until the operation is completed and returns result.
 */
import _ from 'lodash';
import config from 'config';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import esUtils from '../../utils/es';

const ES_METADATA_INDEX = config.get('elasticsearchConfig.metadataIndexName');

const permissions = tcMiddleware.permissions;

module.exports = [
  permissions('project.admin'),
  (req, res, next) => {
    try {
      const logger = req.log;
      logger.debug('Entered Admin#migrateFromDb');

      const indexName = _.get(req, 'body.indexName');
      logger.debug('indexName', indexName);

      if (!indexName) {
        const apiErr = new Error('"indexName" is required.');
        apiErr.status = 400;
        throw apiErr;
      }

      if (indexName !== ES_METADATA_INDEX) {
        const apiErr = new Error(`Only "indexName" === "${ES_METADATA_INDEX}" is supported for now.`);
        apiErr.status = 400;
        throw apiErr;
      }

      esUtils.indexMetadata()
        .then(() => {
          res.status(200).json({ message: 'Data has been successfully migrated.' });
        })
        .catch(next);
    } catch (err) {
      next(err);
    }
  },
];
