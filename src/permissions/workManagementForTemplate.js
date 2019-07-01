
import _ from 'lodash';
import util from '../util';
import models from '../models';

/**
 * Based on allowRule and denyRule allow/deny users to execute the policy
 * @param {String}    policy      the work management permission policy
 * @return {Promise}              Returns a promise
 */
module.exports = policy => freq => new Promise((resolve, reject) => {
  const projectId = _.parseInt(freq.params.projectId);
  return models.Project.findOne({
    where: {
      id: projectId,
    },
  })
        .then((project) => {
          if (!project) {
            return resolve(true);
          }

          if (!project.templateId) {
            const errorMessage = 'You do not have permissions to perform this action';
            return reject(new Error(errorMessage));
          }

          return models.WorkManagementPermissions.findOne({
            where: {
              policy,
              projectTemplateId: project.templateId,
            },
          });
        })
        .then((management) => {
          if (!management) {
            const errorMessage = 'You do not have permissions to perform this action';
            return reject(new Error(errorMessage));
          }

          return models.ProjectMember.getActiveProjectMembers(projectId)
          .then((members) => {
            const req = freq;
            const mem = _.find(members, m => m.userId === req.authUser.userId);
            let allowRule = false;
            if (management.allowRule) {
              if (management.allowRule.projectRoles
                && management.allowRule.projectRoles.length > 0
                && !_.isUndefined(mem)) {
                allowRule = allowRule || _.includes(management.allowRule.projectRoles, mem.role);
              }
              if (management.allowRule.topcoderRoles && management.allowRule.topcoderRoles.length > 0) {
                allowRule = allowRule || util.hasRoles(freq, management.allowRule.topcoderRoles);
              }
            }
            if (management.denyRule) {
              let denyRuleProject = false;
              let denyRuleTopcoder = false;
              if (management.denyRule.projectRoles
                && management.denyRule.projectRoles.length > 0
                && !_.isUndefined(mem)) {
                denyRuleProject = _.includes(management.denyRule.projectRoles, mem.role);
              }
              if (management.denyRule.topcoderRoles && management.denyRule.topcoderRoles.length > 0) {
                denyRuleTopcoder = util.hasRoles(freq, management.denyRule.topcoderRoles);
              }

              const denyRule = (denyRuleProject || denyRuleTopcoder);
              return !denyRule && allowRule;
            }

            return allowRule;
          });
        })
        .then((hasAccess) => {
          if (!hasAccess) {
            const errorMessage = 'You do not have permissions to perform this action';
            return reject(new Error(errorMessage));
          }
          return resolve(true);
        });
});
