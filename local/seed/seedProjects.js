import util from '../../src/tests/util';

const axios = require('axios');
const Promise = require('bluebird');
const _ = require('lodash');
const projects = require('./projects.json');

/**
 * Create projects and update their statuses.
 */
module.exports = (targetUrl, token) => {
  let projectPromises;

  const projectsUrl = `${targetUrl}projects`;
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  const adminHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${util.jwts.connectAdmin}`,
  };

  console.log('Creating projects');
  projectPromises = projects.map((project, i) => {
    const status = _.get(project, 'param.status');
    const cancelReason = _.get(project, 'param.cancelReason');
    const invites = _.cloneDeep(_.get(project, 'param.invites'));
    const acceptInvitation = _.get(project, 'param.acceptInvitation');

    delete project.param.status;
    delete project.param.cancelReason;
    delete project.param.invites;
    delete project.param.acceptInvitation;

    return axios
      .post(projectsUrl, project, { headers })
      .catch((err) => {
        console.log(`Failed to create project ${i}: ${err.message}`);
      })
      .then(async (response) => {
        const projectId = _.get(response, 'data.result.content.id');

        if (Array.isArray(invites)) {
          let promises = []
          invites.forEach(invite => {
            promises.push(createProjectMemberInvite(projectId, invite, targetUrl, headers))
          })
          const responses = await Promise.all(promises)
          if (acceptInvitation) {
            let acceptInvitationPromises = []
            responses.forEach(response => {
              const userId = _.get(response, 'data.result.content.success[0].userId')
              acceptInvitationPromises.push(updateProjectMemberInvite(projectId, {
                param: {
                  userId,
                  status: 'accepted'
                }
              }, targetUrl, adminHeaders))
            })

            await Promise.all(acceptInvitationPromises)
          }
        }

        return {
          projectId,
          status,
          cancelReason,
        };
      });
  });

  return Promise.all(projectPromises)
    .then((createdProjects) => {
      console.log('Updating statuses');
      return Promise.all(
        createdProjects.map(({ projectId, status, cancelReason }) =>
          updateProjectStatus(projectId, { status, cancelReason }, targetUrl, headers).catch((ex) => {
            console.log(`Failed to update project status of project with id ${projectId}: ${ex.message}`);
          }),
        ),
      );
    })
    .then(() => console.log('Done project seed.'))
    .catch(ex => console.error(ex));
};

function updateProjectStatus(project, updateParams, targetUrl, headers) {
  const projectUpdateUrl = `${targetUrl}projects/${project}`;

  // only cancelled status requires cancelReason
  if (updateParams.status !== 'cancelled') {
    delete updateParams.cancelReason;
  }

  return axios.patch(
    projectUpdateUrl,
    {
      param: updateParams,
    },
    {
      headers,
    },
  );
}

function createProjectMemberInvite(projectId, params, targetUrl, headers) {
  const projectMemberInviteUrl = `${targetUrl}projects/${projectId}/members/invite`;

  return axios
    .post(projectMemberInviteUrl, params, { headers })
    .catch((err) => {
      console.log(`Failed to create project member invites ${projectId}: ${err.message}`);
    })
}

function updateProjectMemberInvite(projectId, params, targetUrl, headers) {
  const updateProjectMemberInviteUrl = `${targetUrl}projects/${projectId}/members/invite`;

  return axios
    .put(updateProjectMemberInviteUrl, params, { headers })
    .catch((err) => {
      console.log(`Failed to update project member invites ${projectId}: ${err.message}`);
    })
}

