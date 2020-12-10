/* eslint-disable no-console, no-restricted-syntax, no-await-in-loop */
/**
 * Insert sample projects with bookmarks into the database.
 */

import models from '../../src/models';

const projects = require('./Project.db.dump.json');

/**
 * Main function.
 *
 * @returns {Promise} void
 */
async function main() {
  for (const project of projects) {
    await models.Project.create(project, {
      include: [{
        model: models.ProjectMember,
        as: 'members',
      }, {
        model: models.ProjectPhase,
        as: 'phases',
        include: [{
          model: models.PhaseProduct,
          as: 'products',
        }],
      }, {
        model: models.ProjectMemberInvite,
        as: 'invites',
      }, {
        model: models.ProjectAttachment,
        as: 'attachments',
      }],
    });
    console.log(`insert project with id ${project.id}`);
  }
}

main().then(() => {
  console.log('done!');
  process.exit();
}).catch((err) => {
  console.error(`Error ${err.name} occurs. Operation failed`);
  process.exit(1);
});
