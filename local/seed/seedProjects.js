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

  console.log('Creating projects');
  projectPromises = projects.map((project, i) => {
    const status = _.get(project, 'param.status');
    const cancelReason = _.get(project, 'param.cancelReason');
    delete project.param.status;
    delete project.param.cancelReason;

    return axios
      .post(projectsUrl, project, { headers })
      .catch((err) => {
        console.log(`Failed to create project ${i}: ${err.message}`);
      })
      .then((response) => {
        const projectId = _.get(response, 'data.result.content.id');

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
