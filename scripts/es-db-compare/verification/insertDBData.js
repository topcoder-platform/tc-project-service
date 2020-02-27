/* eslint-disable no-console, no-restricted-syntax, no-await-in-loop */
/*
 * Insert DB mock data.
 */
import models from '../../../src/models';

const _ = require('lodash');
const scriptConstants = require('../constants');
const projectsFromDB = require('./Project.db.dump.json');
const metadataFromDB = require('./Metadata.db.dump.json');
const timelinesFromDB = require('./Timeline.db.dump.json');

/**
 * Main function.
 *
 * @returns {Promise} void
 */
async function main() {
  for (const project of projectsFromDB) {
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
  console.log('inserting metadata...');
  for (const refPath of Object.keys(scriptConstants.associations.metadata)) {
    const modelName = scriptConstants.associations.metadata[refPath];
    for (const record of metadataFromDB[refPath]) {
      await models[modelName].create(record);
    }
  }
  console.log('inserting metadata done!');
  for (const timeline of timelinesFromDB) {
    await models.Timeline.create(_.omit(timeline, 'milestones'));
    if (timeline.milestones) {
      for (const milestone of timeline.milestones) {
        await models.Milestone.create(milestone);
        console.log(`insert milestone with id ${milestone.id}`);
      }
    }
    console.log(`insert timeline with id ${timeline.id}`);
  }
}

main().then(() => {
  console.log('done!');
  process.exit();
}).catch((err) => {
  console.error(`Error ${err.name} occurs. Operation failed`);
  process.exit(1);
});
