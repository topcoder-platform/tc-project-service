/* eslint-disable no-console, no-restricted-syntax, no-await-in-loop */
/**
 * Migrate project.bookmarks field to project.attachment with attachment type = 'link'
 */

import _ from 'lodash';
import sequelize from 'sequelize';
import models from '../../src/models';
import { ATTACHMENT_TYPES } from '../../src/constants';

console.log('Migrate project.bookmarks to project.attachments for all projects in the database');

/**
 * Get projects from DB.
 *
 * @returns {Promise} the DB data
 */
const getProjectsWithBookmarks = () => models.Project.findAll({
  raw: false,
  attributes: ['id', 'bookmarks', 'createdAt', 'createdBy', 'updatedAt', 'updatedBy'],
  where: sequelize.where(
    sequelize.fn('json_array_length', sequelize.col('bookmarks')),
    { [sequelize.Op.gt]: 0 },
  ),
});

/**
 * Executes the bookmarks migration to link attachments
 * @returns {Promise}  resolved when migration is complete
 */
const migrateBookmarks = async () => {
  const projects = await getProjectsWithBookmarks();
  let count = 0;

  console.log(`Found ${projects.length} projects.`);

  for (const project of projects) {
    await models.sequelize.transaction(async (tr) => { // eslint-disable-line no-loop-func
      count += 1;
      const percentage = Math.round((count / projects.length) * 100);

      console.log(`Processing project id ${project.id}: ${count}/${projects.length} (${percentage}%)...`);

      const bookmarks = _.get(project, 'bookmarks', []);
      console.log(`Processing project id ${project.id}: found ${bookmarks.length} bookmarks`);

      if (bookmarks.length === 0) {
        console.log(`Processing project id ${project.id}: skipped.`);
        return;
      }

      const attachments = bookmarks.map(b => ({
        projectId: project.id,
        type: ATTACHMENT_TYPES.LINK,
        title: b.title,
        path: b.address,
        createdAt: _.isNil(b.createdAt) ? project.createdAt : b.createdAt,
        createdBy: _.isNil(b.createdBy) ? project.createdBy : b.createdBy,
        updatedAt: _.isNil(b.updatedAt) ? project.updatedAt : b.updatedAt,
        updatedBy: _.isNil(b.updatedBy) ? project.updatedBy : b.updatedBy,
        tags: [],
      }));

      await models.ProjectAttachment.bulkCreate(attachments, { transaction: tr });
      console.log(`Processing project id ${project.id}: attachments created.`);

      project.bookmarks = [];
      await project.save({ transaction: tr });
      console.log(`Processing project id ${project.id}: bookmarks removed.`);

      console.log(`Processing project id ${project.id}: done.`);
    });
  }
};

migrateBookmarks().then(() => {
  console.log('Migration of projects bookmarks to project links attachments finished!');
  process.exit();
}).catch((e) => {
  console.error('Migration of projects bookmarks to project links attachments failed!');
  console.error(e);
  process.exit();
});
