/**
 * Event handler for the creation of `talent-as-a-service` projects.
 */

import _, { forEach } from 'lodash';
import config from 'config';
import axios from 'axios';
import models from '../../models';

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
      job => createTaasJob(req.headers.authorization, {
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
        /* eslint no-param-reassign: "error" */
        job.jobId = createdJob.id;
      }).catch((err) => {
        logger.error(`Unable to create job with title "${job.title}": ${err.message}`);
      }),
    ),
  );
  const projectWithJobs = await models.Project.findByPk(project.id);
  if (!projectWithJobs) {
    logger.error(`Project not found for id ${project.id}, so couldn't save TaaS Job IDs`);
  }
  projectWithJobs.details.taasDefinition.taasJobs = jobs;
  projectWithJobs.changed('details', true);
  await projectWithJobs.save();
}

/**
 * Update taas job.
 *
 * @param {String} authHeader the authorization header
 * @param {Object} data the job data
 * @return {Object} the job created
 */
async function updateTaasJob(authHeader, data) {
  const headers = {
    'Content-Type': 'application/json',
    Authorization: authHeader,
  };
  // Remove the jobId because it can't be passed to the taas API PATCH call
  const jobId = data.jobId;
  delete data.jobId;

  const res = await axios
    .patch(`${config.taasJobApiUrl}/${jobId}`, data, { headers })
    .catch((err) => {
      const error = new Error();
      error.message = _.get(err, 'response.data.message', error.message);
      throw error;
    });
  return res.data;
}

/**
 * Update taas jobs from project of type `talent-as-a-service` using the token from current user.
 * This is called when a `talent-as-a-service` project is updated
 *
 * @param {Object} req the request object
 * @param {Object} project the project data
 * @param {Object} logger the logger object
 * @return {Object} the taas jobs created
 */
async function updateTaasJobsFromProject(req, project, logger) {
  const originalJobs = _.get(project, 'details.taasDefinition.taasJobs');
  if (!originalJobs || !originalJobs.length) {
    logger.debug(`No jobs found in the project id to update: ${project.id}`);
    return;
  }
  logger.debug(`${originalJobs.length} jobs found in the project id to update: ${project.id}`);

  const updateJobs = [];
  const createJobs = [];

  // Split new jobs out from ones that need to be updated
  // If a job already has an ID assigned, assume it needs to be updated
  forEach(originalJobs, (job) => {
    if (job.jobId) {
      updateJobs.push(job);
    } else {
      createJobs.push(job);
    }
  });

  await Promise.all(
    _.map(
      updateJobs,
      job => updateTaasJob(req.headers.authorization, {
        jobId: job.jobId,
        title: job.title,
        description: job.description,
        duration: Number(job.duration),
        skills: job.skills,
        numPositions: Number(job.people),
        resourceType: _.get(job, 'role.value', ''),
        workload: _.get(job, 'workLoad.title', '').toLowerCase(),
      }).then((updatedJob) => {
        logger.debug(`jobId: ${updatedJob.id} job updated with title "${updatedJob.title}"`);
      }).catch((err) => {
        logger.error(`Unable to update job with title "${job.title}": ${err.message}`);
      }),
    ),
  );

  await Promise.all(
    _.map(
      createJobs,
      job => createTaasJob(req.headers.authorization, {
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
        /* eslint no-param-reassign: "error" */
        job.jobId = createdJob.id;
      }).catch((err) => {
        logger.error(`Unable to create job with title "${job.title}": ${err.message}`);
      }),
    ),
  );
  const jobs = _.concat(updateJobs, createJobs);
  const projectWithJobs = await models.Project.findByPk(project.id);
  if (!projectWithJobs) {
    logger.error(`Project not found for id ${project.id}, so couldn't save TaaS Job IDs`);
  }
  projectWithJobs.details.taasDefinition.taasJobs = jobs;
  projectWithJobs.changed('details', true);
  await projectWithJobs.save();
}

module.exports = {
  createTaasJobsFromProject,
  updateTaasJobsFromProject,
};
