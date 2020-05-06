/* eslint-disable no-unused-vars */
import config from 'config';
import _ from 'lodash';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import util from '../../util';
import { USER_ROLE, PROJECT_MEMBER_ROLE, PROJECT_MEMBER_MANAGER_ROLES } from '../../constants';
import models from '../../models';
import lookerSerivce from '../../services/lookerService';

const permissions = tcMiddleware.permissions;


module.exports = [
  permissions('projectReporting.view'),
  async (req, res, next) => {
    const projectId = Number(req.params.projectId);
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
      if (!mockReport) {
        const project = await models.Project.findOne({
          where: { id: projectId },
          attributes: ['id', 'templateId', 'details'],
          raw: true,
        });

        // we would use Project Template or Product Template category to format report name
        let category = '';

        // try to get project template of the project to generate the report name
        const projectTemplate = project.templateId
          ? await models.ProjectTemplate.findByPk(project.templateId, { attributes: ['category'], raw: true })
          : null;
        if (projectTemplate) {
          category = _.get(projectTemplate, 'category', '');

        // if no project template found, try to find product template (for old project v2)
        } else {
          const productTemplate = _.get(project, 'details.products[0]')
            ? await models.ProductTemplate.findOne(
              {
                where: {
                  productKey: _.get(project, 'details.products[0]'),
                },
              },
              {
                attributes: ['category'],
                raw: true,
              },
            ) : null;

          category = _.get(productTemplate, 'category', '');
        }

        reportName = `${reportName}-${category}`;
      }
      // check if auth user has acecss to this project
      const members = req.context.currentProjectMembers;
      let member = _.find(members, m => m.userId === authUser.userId);
      const isAdmin = util.hasRoles(req, [USER_ROLE.CONNECT_ADMIN, USER_ROLE.TOPCODER_ADMIN]);
      const userDisallowed = allowedUsers.length > 0 && !allowedUsers.includes(authUser.userId);
      if (userDisallowed) {
        req.log.error(`User whitelisting prevented accessing report ${reportName} to ${authUser.userId}`);
        return res.status(403).send('User is not allowed to access the report');
      }
      if (!member && isAdmin) {
        const token = await util.getM2MToken();
        const adminUser = await util.getTopcoderUser(authUser.userId, token, req.log);
        req.log.trace(adminUser, 'adminUser');
        member = {
          firstName: adminUser.firstName,
          lastName: adminUser.lastName,
          userId: adminUser.userId,
          role: '',
        };
      }
      let roleKey = '';
      if (!mockReport) {
        if ([PROJECT_MEMBER_ROLE.CUSTOMER, PROJECT_MEMBER_ROLE.COPILOT].includes(member.role)) {
          roleKey = member.role;
        }
        if (isAdmin || PROJECT_MEMBER_MANAGER_ROLES.includes(member.role)) {
          roleKey = 'topcoder';
        }
        reportName = `${reportName}-${roleKey}`;
      }
      // pick the report based on its name
      let result = {};
      const project = { id: projectId };
      const embedUrl = REPORTS[reportName];
      req.log.trace(`Generating embed URL for ${reportName} report, using ${embedUrl} as embed URL.`);
      if (embedUrl) {
        result = await lookerSerivce.generateEmbedUrlForProject(req.authUser, project, member, embedUrl);
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
