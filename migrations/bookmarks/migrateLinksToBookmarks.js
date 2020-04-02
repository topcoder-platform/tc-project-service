/* eslint-disable no-console, no-restricted-syntax, no-await-in-loop */
/**
 * Migrate project.attachments of type 'link' field to project.bookmark
 */

import _ from 'lodash';
import models from '../../src/models';
import { ATTACHMENT_TYPES } from '../../src/constants';

console.log('Migrate project.attachments of type \'link\' to project.bookmarks for all projects in the database');

/**
 * Get projects from DB.
 *
 * @returns {Promise} the DB data
 */
const getAllProjectsFromDB = async () => models.Project.findAll({
  raw: false,
  attributes: ['id', 'bookmarks'],
});

/**
 * Gets the active project links (Links that were not deleted) for the given project.
 *
 * @param {Number} projectId The project id for which to get the active links
 * @returns {Promise} The active project links promise
 */
const getActiveProjectLinks = async projectId => models.ProjectAttachment
  .findAll({
    where: {
      projectId,
      type: ATTACHMENT_TYPES.LINK,
    },
    raw: true,
  });

/**
 * Executes the migration of link attachments to bookmarks for all projects in the database.
 * @returns {Promise} resolved when the migration is complete
 */
const migrateLinksToBookmarks = async () => {
  const projects = await getAllProjectsFromDB();
  let count = 0;

  console.log(`Found ${projects.length} projects in total.`);

  for (const project of projects) {
    await models.sequelize.transaction(async (tr) => { // eslint-disable-line no-loop-func
      count += 1;
      const percentage = Math.round((count / projects.length) * 100);

      console.log(`Processing project id ${project.id}: ${count}/${projects.length} (${percentage}%)...`);

      const links = await getActiveProjectLinks(project.id);
      console.log(`Processing project id ${project.id}: found ${links.length} link attachments`);

      if (links.length === 0) {
        console.log(`Processing project id ${project.id}: skipped.`);
        return;
      }

      const bookmarks = links.map(link => ({
        title: link.title,
        address: link.path,
        createdAt: link.createdAt,
        createdBy: link.createdBy,
        updatedAt: link.updatedAt,
        updatedBy: link.updatedBy,
      }));

      project.bookmarks = bookmarks;
      await project.save({
        transaction: tr,
      });
      console.log(`Processing project id ${project.id}: bookmarks created.`);

      await models.ProjectAttachment.destroy({
        where: {
          id: _.map(links, 'id'),
        },
        transaction: tr,
      });
      console.log(`Processing project id ${project.id}: attachments removed.`);

      console.log(`Processing project id ${project.id}: done.`);
    });
  }
};

migrateLinksToBookmarks().then(() => {
  console.log('Migration of projects link attachments to project bookmarks finished!');
  process.exit();
}).catch((e) => {
  console.error('Migration of projects link attachments to project bookmarks failed!');
  console.log(e);
  process.exit();
});
