
import _ from 'lodash';
import util from '../util';
import models from '../models';

/**
 * Topcoder admin and Project managers who are part of the project can view the copilot applications in it
 * Also, users who had an application will have access to view it.
 * @param {Object}    freq        the express request instance
 * @return {Promise}              Returns a promise
 */
module.exports = freq => new Promise((resolve, reject) => {
  console.log("start permission check");
  const opportunityId = _.parseInt(freq.params.id);
  const currentUserId = freq.authUser.userId;
  return models.CopilotOpportunity.findOne({
    where: {
      id: opportunityId,
    },
  })
    .then((opportunity) => {
      const req = freq;
      req.context = req.context || {};
      req.context.currentOpportunity = opportunity;
      const projectId = opportunity.projectId;
      const isProjectManager = util.hasProjectManagerRole(req);

      console.log("got opportunity", opportunityId);
      return models.ProjectMember.getActiveProjectMembers(projectId)
      .then((members) => {

        console.log("got active members", projectId);
        return models.CopilotApplication.findOne({
          where: {
            opportunityId: opportunityId,
            userId: currentUserId,
          },
        }).then((copilotApplication) => {
          const isPartOfProject = isProjectManager && members.find(member => member.userId === currentUserId);
          // check if auth user has acecss to this project
          const hasAccess = util.hasAdminRole(req) || isPartOfProject || !!copilotApplication;
          console.log("got assigned application", hasAccess);
          return Promise.resolve(hasAccess);
        })
      })
    })
    .then((hasAccess) => {
      if (!hasAccess) {
        const errorMessage = 'You do not have permissions to perform this action';
        // user is not an admin nor is a registered project member
        return reject(new Error(errorMessage));
      }
      return resolve(true);
    });
});
