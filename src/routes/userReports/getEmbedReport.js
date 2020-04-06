/* eslint-disable no-unused-vars */
import config from 'config';
import _ from 'lodash';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import util from '../../util';
import { USER_ROLE, ADMIN_ROLES, MANAGER_ROLES } from '../../constants';
import lookerSerivce from '../../services/lookerService';

const permissions = tcMiddleware.permissions;


module.exports = [
  async (req, res, next) => {
    const mockReport = config.get('lookerConfig.USE_MOCK') === 'true';
    let reportName = mockReport ? 'mock' : req.query.reportName;
    const authUser = req.authUser;
    let REPORTS = null;
    let allowedUsers = null;
    try {
      allowedUsers = config.get('lookerConfig.ALLOWED_USERS');
      allowedUsers = allowedUsers ? JSON.parse(allowedUsers) : [];
      req.log.trace(allowedUsers, 'allowedUsers');
      REPORTS = JSON.parse(config.get('lookerConfig.EMBED_REPORTS_MAPPING'));
    } catch (error) {
      req.log.error(error);
      req.log.debug('Invalid reports mapping. Should be a valid JSON.');
    }
    if (!mockReport && !REPORTS) {
      return res.status(404).send('Report not found');
    }

    try {
      const isAdmin = util.hasRoles(req, ADMIN_ROLES);
      const userDisallowed = allowedUsers.length > 0 && !allowedUsers.includes(authUser.userId);
      if (userDisallowed) {
        req.log.error(`User whitelisting prevented accessing report ${reportName} to ${authUser.userId}`);
        return res.status(403).send('User is not allowed to access the report');
      }
      const token = await util.getM2MToken();
      const callerUser = await util.getTopcoderUser(authUser.userId, token, req.log);
      req.log.trace(callerUser, 'callerUser');
      const member = {
        firstName: callerUser.firstName,
        lastName: callerUser.lastName,
        userId: authUser.userId,
        role: '',
      };
      let roleKey = '';
      if (!mockReport) {
        if (util.hasRoles(req, [USER_ROLE.COPILOT])) {
          roleKey = 'copilot';
        } else if (isAdmin || util.hasRoles(req, MANAGER_ROLES)) {
          roleKey = 'topcoder';
        } else {
          roleKey = 'customer';
        }
        reportName = `${reportName}-${roleKey}`;
      }
      // pick the report based on its name
      let result = {};
      const embedUrl = REPORTS[reportName];
      req.log.trace(`Generating embed URL for ${reportName} report, using ${embedUrl} as embed URL.`);
      if (embedUrl) {
        result = await lookerSerivce.generateEmbedUrlForUser(req.authUser, member, embedUrl);
      } else {
        return res.status(404).send('Report not found');
      }

      req.log.trace(result);
      return res.status(200).json(result);
    } catch (err) {
      req.log.error(err);
      return res.status(500).send(err.toString());
    }
  },
];
