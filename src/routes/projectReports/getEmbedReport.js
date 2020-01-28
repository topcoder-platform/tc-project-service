/* eslint-disable no-unused-vars */
// import config from 'config';
import _ from 'lodash';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import util from '../../util';
import { PROJECT_MEMBER_MANAGER_ROLES, USER_ROLE, PROJECT_MEMBER_ROLE } from '../../constants';
import lookerSerivce from '../../services/lookerService';

const permissions = tcMiddleware.permissions;


module.exports = [
  permissions('projectReporting.managers'),
  async (req, res, next) => {
    const projectId = Number(req.params.projectId);
    const reportName = req.query.reportName;
    const authUser = req.authUser;

    try {
      // check if auth user has acecss to this project
      const members = req.context.currentProjectMembers;
      let member = _.find(members, m => m.userId === req.authUser.userId);
      const isManager = member && PROJECT_MEMBER_MANAGER_ROLES.indexOf(member.role) > -1;
      const isAdmin = util.hasRoles(req, [USER_ROLE.CONNECT_ADMIN, USER_ROLE.TOPCODER_ADMIN]);
      const isCopilot = member && member.role === PROJECT_MEMBER_ROLE.COPILOT;
      const isCustomer = member && member.role === PROJECT_MEMBER_ROLE.CUSTOMER;
      console.log(isAdmin, 'isAdmin');
      console.log(member, 'member');
      if (!member && isAdmin) {
        const token = await util.getM2MToken();
        console.log(token);
        const adminUser = await util.getTopcoderUser(authUser.userId, token, req.log);
        console.log(adminUser, 'adminUser');
        member = {
          firstName: adminUser.firstName,
          lastName: adminUser.lastName,
          userId: adminUser.userId,
          role: '',
        };
      }
      // pick the report based on its name
      let result = {};
      const project = { id: projectId };
      switch (reportName) {
        case 'summary':
          result = await lookerSerivce.generateEmbedUrl(req.authUser, project, member, '/embed/looks/1');
          break;
        default:
          return res.status(404).send('Report not found');
      }

      req.log.debug(result);
      return res.status(200).json(result);
    } catch (err) {
      req.log.error(err);
      return res.status(500).send(err.toString());
    }
  },
];
