/* eslint-disable no-param-reassign, no-restricted-syntax, no-await-in-loop */
/**
 * Temporary script to fix project in DB to be indexed in ES
 *
 * Update all records in the Project table.
 */
import _ from 'lodash';
import models from '../models';

/**
 * Fix all projects.
 *
 * @param {Object} logger logger
 *
 * @returns {Promise} resolved when dene
 */
async function fixProjects(logger) {
  const path = 'taasDefinition.team.skills';
  const projects = await models.Project.findAll();
  for (const project of projects) {
    if (project.details) {
      const details = JSON.parse(JSON.stringify(project.details));
      const skills = _.get(details, path);
      if (!_.isUndefined(skills) && !_.isArray(skills)) {
        _.set(details, path, []);
        project.details = details;
        await project.save();
        logger.info(`updated record of Project with id ${project.id}`);
      }
    }
  }
}

/**
 * Fix project model.
 *
 * @param {Object} logger logger
 *
 * @returns {undefined}
 */
async function fixProjectsForES(logger) {
  await fixProjects(logger);
}

module.exports = fixProjectsForES;
