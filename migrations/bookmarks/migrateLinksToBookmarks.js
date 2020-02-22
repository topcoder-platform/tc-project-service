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
const getAllProjectsFromDB = async () => models.Project.findAll({ raw: false });

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
                     deletedAt: { $eq: null },
                     type: ATTACHMENT_TYPES.LINK,
                   },
                   raw: false,
                 });

/**
 * Executes the migration of link attachments to bookmarks for all projects in the database.
 * @returns {Promise} resolved when the migration is complete
 */
const migrateLinksToBookmarks = async () => {
  const projects = await getAllProjectsFromDB();

  for (const project of projects) {
      // get the project links
    const links = await getActiveProjectLinks(project.id);
    const bookmarks = [];

    _.each(links, async (link) => {
      bookmarks.push({
        title: link.title,
        address: link.path,
        createdAt: link.createdAt,
        createdBy: link.createdBy,
        updatedAt: link.updatedAt,
        updatedBy: link.updatedBy,
      });

      await link.destroy();
    });

    project.bookmarks = bookmarks;
    await project.save();
  }
};

migrateLinksToBookmarks().then(() => {
  console.log('Migration of projects link attachments to project bookmarks finished!');
  process.exit();
}).catch((e) => {
  console.log(e);
  process.exit();
});
