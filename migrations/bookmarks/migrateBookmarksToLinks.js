/* eslint-disable no-console, no-restricted-syntax, no-await-in-loop */
/**
 * Migrate project.bookmarks field to project.attachment with attachment type = 'link'
 */

import _ from 'lodash';
import models from '../../src/models';
import { ATTACHMENT_TYPES } from '../../src/constants';

console.log('Migrate project.bookmarks to project.attachments for all projects in the database');

/**
 * Get projects from DB.
 *
 * @returns {Promise} the DB data
 */
const getAllProjectsFromDB = async () => models.Project.findAll({ raw: false });

/**
 * Executes the bookmarks migration to link attachments
 * @returns {Promise}  resolved when migration is complete
 */
const migrateBookmarks = async () => {
  const projects = await getAllProjectsFromDB();

  for (const project of projects) {
    const bookmarks = _.get(project, 'bookmarks');

    _.each(bookmarks, async (b) => {
      await models.ProjectAttachment.create({
        projectId: project.id,
        type: ATTACHMENT_TYPES.LINK,
        title: b.title,
        path: b.address,
        createdAt: _.isNil(b.createdAt) ? project.createdAt : b.createdAt,
        createdBy: _.isNil(b.createdBy) ? project.createdBy : b.createdBy,
        updatedAt: _.isNil(b.updatedAt) ? project.updatedAt : b.updatedAt,
        updatedBy: _.isNil(b.updatedBy) ? project.updatedBy : b.updatedBy,
        tags: [],
      });
    });
    project.bookmarks = [];
    await project.save();
  }
};

migrateBookmarks().then(() => {
  console.log('Migration of projects bookmarks to project links attachments finished!');
  process.exit();
}).catch((e) => {
  console.log(e);
  process.exit();
});
