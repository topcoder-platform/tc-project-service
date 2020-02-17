/* eslint-disable no-unused-vars */
import config from 'config';
import _ from 'lodash';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import util from '../../util';
import { USER_ROLE } from '../../constants';
import lookerSerivce from '../../services/lookerService';

const permissions = tcMiddleware.permissions;


module.exports = [
  permissions('projectReporting.managers'),
  async (req, res, next) => {
    const projectId = Number(req.params.projectId);
    const reportName = config.lookerConfig.USE_MOCK ? 'mock' : req.query.reportName;
    const authUser = req.authUser;

    try {
      // check if auth user has acecss to this project
      const members = req.context.currentProjectMembers;
      let member = _.find(members, m => m.userId === req.authUser.userId);
      const isAdmin = util.hasRoles(req, [USER_ROLE.CONNECT_ADMIN, USER_ROLE.TOPCODER_ADMIN]);
      if (!member && isAdmin) {
        const token = await util.getM2MToken();
        const adminUser = await util.getTopcoderUser(authUser.userId, token, req.log);
        req.log.debug(adminUser, 'adminUser');
        member = {
          firstName: adminUser.firstName,
          lastName: adminUser.lastName,
          userId: adminUser.userId,
          role: '',
        };
      }
      // pick the report based on its name
      let result = {};
      let embedUrl = null;
      const project = { id: projectId };
      switch (reportName) {
        case 'summary':
          embedUrl = '/embed/looks/1';
          break;
        case 'mock':
          embedUrl = config.lookerConfig.MOCK_EMBED_REPORT;
          break;
        default:
          return res.status(404).send('Report not found');
      }
      if (embedUrl) {
        result = await lookerSerivce.generateEmbedUrl(req.authUser, project, member, embedUrl);
      }

      req.log.debug(result);
      return res.status(200).json(result);
    } catch (err) {
      req.log.error(err);
      return res.status(500).send(err.toString());
    }
  },
];
