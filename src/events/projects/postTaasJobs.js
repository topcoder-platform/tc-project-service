/**
 * Event handler for the creation of `talent-as-a-service` projects.
 */

import _ from 'lodash';
import config from 'config';
import axios from 'axios';

/**
 * Create taas job.
 *
 * @param {String} authHeader the authorization header
 * @param {Object} data the job data
 * @return {Object} the job created
 */
async function createTaasJob(authHeader, data) {
  const headers = {
    'Content-Type': 'application/json',
    Authorization: authHeader,
  };
  const res = await axios
    .post(config.taasJobApiUrl, data, { headers })
    .catch((err) => {
      const error = new Error();
      error.message = _.get(err, 'response.data.message', error.message);
      throw error;
    });
  return res.data;
}

/**
 * Create taas jobs from project of type `talent-as-a-service` using the token from current user.
 *
 * @param {Object} req the request object
 * @param {Object} project the project data
 * @param {Object} logger the logger object
 * @return {Object} the taas jobs created
 */
async function createTaasJobsFromProject(req, project, logger) {
  const jobs = _.get(project, 'details.taasDefinition.taasJobs');
  if (!jobs || !jobs.length) {
    logger.debug(`no jobs found in the project id: ${project.id}`);
    return;
  }
  logger.debug(`${jobs.length} jobs found in the project id: ${project.id}`);
  await Promise.all(
    _.map(
      jobs,
      (job) => {
        return createTaasJob(req.headers.authorization, {
          projectId: project.id,
          title: job.title,
          description: job.description,
          duration: Number(job.duration),
          skills: job.skills,
          numPositions: Number(job.people),
          resourceType: _.get(job, 'role.value', ''),
          rateType: 'weekly', // hardcode for now
          workload: _.get(job, 'workLoad.title', '').toLowerCase(),
        }).then((createdJob) => {
          logger.debug(`jobId: ${createdJob.id} job created with title "${createdJob.title}"`);
        }).catch((err) => {
          logger.error(`Unable to create job with title "${job.title}": ${err.message}`);
        });
      },
    ),
  );
}

module.exports = createTaasJobsFromProject;
