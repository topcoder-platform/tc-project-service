
/**
 * Admin endpoint to delete ES index.
 *
 * Waits until the operation is completed and returns result.
 */
import _ from 'lodash';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import util from '../../util';

const permissions = tcMiddleware.permissions;

module.exports = [
  permissions('project.admin'),
  (req, res, next) => {
    try {
      const logger = req.log;
      logger.debug('Entered Admin#deleteIndex');

      const indexName = _.get(req, 'body.indexName');
      logger.debug('indexName', indexName);

      if (!indexName) {
        const apiErr = new Error('"indexName" is required.');
        apiErr.status = 400;
        throw apiErr;
      }

      const esClient = util.getElasticSearchClient();
      esClient.indices.delete({ index: indexName })
        .then(() => {
          res.status(200).json({ message: 'Index successfully deleted.' });
        })
        .catch(next);
    } catch (err) {
      next(err);
    }
  },
];
