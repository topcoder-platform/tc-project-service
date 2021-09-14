
import { middleware as tcMiddleware } from 'tc-core-library-js';
import cleanupService from '../../services/cleanupService';

/**
 * API to Cleanup the Postman Testing data.
 *
 */

const permissions = tcMiddleware.permissions;

module.exports = [
  permissions('project.cleanup'),
  async (req, res) => {
    await cleanupService(req);
    res.status(204).json({});
  },
];
