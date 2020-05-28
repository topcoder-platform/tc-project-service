import util from '../../src/tests/util';
import models from '../../src/models';

const axios = require('axios');
const Promise = require('bluebird');
const _ = require('lodash');
const projects = require('./projects.json');

// we make delay after requests which has to be indexed in ES asynchronous
const ES_INDEX_DELAY = 3000;

/**
 * Create projects and update their statuses.
 */
module.exports = (targetUrl, token) => {
  let projectPromises;

  const projectsUrl = `${targetUrl}projects`;
  const adminHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  const connectAdminHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${util.jwts.connectAdmin}`,
  };

  console.log('Creating projects');
  projectPromises = projects.map(async (project, i) => {
    const status = _.get(project, 'status');
    const cancelReason = _.get(project, 'cancelReason');
    const invites = _.cloneDeep(_.get(project, 'invites'));
    const acceptInvitation = _.get(project, 'acceptInvitation');

    if (project.templateId) {
      await findProjectTemplate(project.templateId, targetUrl, adminHeaders).catch((ex) => {
        delete project.templateId;
      });
    }

    delete project.status;
    delete project.cancelReason;
    delete project.invites;
    delete project.acceptInvitation;

    return axios
      .post(projectsUrl, project, { headers: adminHeaders })
      .catch((err) => {
        console.log(`Failed to create project ${i}: ${err.message}`);
      })
      .then(async (response) => {
        const projectId = _.get(response, 'data.id');

        // updating status
        if (status !== _.get(response, 'data.status')) {
          console.log(`Project #${projectId}: Wait a bit to give time ES to index before updating status...`);
          await Promise.delay(ES_INDEX_DELAY);
          await updateProjectStatus(projectId, { status, cancelReason }, targetUrl, adminHeaders).catch((ex) => {
            console.error(`Project #${projectId}: Failed to update project status: ${ex.message}`);
          });
        }

        await models.ProjectEstimation.create({
          projectId,
          buildingBlockKey: 'BLOCK_KEY',
          conditions: '( HAS_DEV_DELIVERABLE && ONLY_ONE_OS_MOBILE && CA_NEEDED )',
          price: 6500.50,
          quantity: 10,
          minTime: 35,
          maxTime: 35,
          metadata: {
            deliverable: 'dev-qa',
          },
          createdBy: 1,
          updatedBy: 1,
        });

        // creating invitations
        if (Array.isArray(invites)) {
          const promises = [];
          invites.forEach((invite) => {
            promises.push(createProjectMemberInvite(projectId, invite, targetUrl, connectAdminHeaders));
          });

          // accepting invitations
          console.log(`Project #${projectId}: Wait a bit to give time ES to index before creating invitation...`);
          await Promise.delay(ES_INDEX_DELAY);
          const responses = await Promise.all(promises);
          if (acceptInvitation) {
            const acceptInvitationPromises = [];
            responses.forEach((response) => {
              const userId = _.get(response, 'data.success[0].userId');
              acceptInvitationPromises.push(updateProjectMemberInvite(projectId, {
                userId,
                status: 'accepted',
              }, targetUrl, connectAdminHeaders));
            });

            console.log(`Project #${projectId}: Wait a bit to give time ES to index before accepting invitation...`);
            await Promise.delay(ES_INDEX_DELAY);
            await Promise.all(acceptInvitationPromises);
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
    updateParams,
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
    });
}

function updateProjectMemberInvite(projectId, params, targetUrl, headers) {
  const updateProjectMemberInviteUrl = `${targetUrl}projects/${projectId}/members/invite`;

  return axios
    .put(updateProjectMemberInviteUrl, params, { headers })
    .catch((err) => {
      console.log(`Failed to update project member invites ${projectId}: ${err.message}`);
    });
}

function findProjectTemplate(templateId, targetUrl, headers) {
  const projectTemplateUrl = `${targetUrl}projects/metadata/projectTemplates/${templateId}`;

  return axios({
    url: projectTemplateUrl,
    headers,
  });
}
