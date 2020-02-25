/* eslint-disable no-unused-vars */
import config from 'config';
import _ from 'lodash';

import { middleware as tcMiddleware } from 'tc-core-library-js';
import LookApi from './LookRun';
import mock from './mock';
import util from '../../util';
import { PROJECT_MEMBER_MANAGER_ROLES, USER_ROLE, PROJECT_MEMBER_ROLE } from '../../constants';

const permissions = tcMiddleware.permissions;


module.exports = [
  permissions('project.view'),
  async (req, res, next) => {
    const projectId = Number(req.params.projectId);
    const reportName = req.query.reportName;

    if (config.get('lookerConfig.USE_MOCK') === 'true') {
      req.log.info('using mock');
      // using mock
      return mock(projectId, reportName, req, res);
      // res.status(200).json(project);
    }
    const lookApi = new LookApi(req.log);

    try {
      // check if auth user has acecss to this project
      const members = req.context.currentProjectMembers;
      const member = _.find(members, m => m.userId === req.authUser.userId);
      const isManager = member && PROJECT_MEMBER_MANAGER_ROLES.indexOf(member.role) > -1;
      const isAdmin = util.hasRoles(req, [USER_ROLE.CONNECT_ADMIN, USER_ROLE.TOPCODER_ADMIN]);
      const isCopilot = member && member.role === PROJECT_MEMBER_ROLE.COPILOT;
      const isCustomer = member && member.role === PROJECT_MEMBER_ROLE.CUSTOMER;
      // pick the report based on its name
      let result = {};
      switch (reportName) {
        case 'summary':
          result = await lookApi.findProjectRegSubmissions(projectId);
          break;
        case 'projectBudget':
          result = await lookApi.findProjectBudget(projectId, { isManager, isAdmin, isCopilot, isCustomer });
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
