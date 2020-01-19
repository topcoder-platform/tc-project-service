/* eslint-disable no-console */
/*
 * Compare data between DB and ES and generate a report to be uploaded
 * to AWS S3.
 */

import Joi from 'joi';
import lodash from 'lodash';
import config from 'config';

import models from '../../src/models';
import util from '../../src/util';
import { INVITE_STATUS } from '../../src/constants';

const handlebars = require('handlebars');
const path = require('path');
const fs = require('fs');
const { compareProjects } = require('./compareProjects');

const scriptConfig = {
  PROJECT_START_ID: process.env.PROJECT_START_ID,
  PROJECT_END_ID: process.env.PROJECT_END_ID,
  PROJECT_LAST_ACTIVITY_AT: process.env.PROJECT_LAST_ACTIVITY_AT,
};

const reportPathname = './report.html';

const configSchema = Joi.object().keys({
  PROJECT_START_ID: Joi.number().integer().positive().optional(),
  PROJECT_END_ID: Joi.number().integer().positive().optional(),
  PROJECT_LAST_ACTIVITY_AT: Joi.date().optional(),
})
  .with('PROJECT_START_ID', 'PROJECT_END_ID')
  .or('PROJECT_START_ID', 'PROJECT_LAST_ACTIVITY_AT');

try {
  Joi.attempt(scriptConfig, configSchema);
} catch (err) {
  console.error(err.message);
  process.exit();
}

const es = util.getElasticSearchClient();

const ES_PROJECT_INDEX = config.get('elasticsearchConfig.indexName');
const ES_PROJECT_TYPE = config.get('elasticsearchConfig.docType');

/**
 * Get es search criteria.
 *
 * @returns {Object} the search criteria
 */
function getESSearchCriteria() {
  const filters = [];
  if (!lodash.isNil(scriptConfig.PROJECT_START_ID)) {
    filters.push({
      filtered: {
        filter: {
          range: {
            id: {
              gte: scriptConfig.PROJECT_START_ID,
              lte: scriptConfig.PROJECT_END_ID,
            },
          },
        },
      },
    });
  }
  if (!lodash.isNil(scriptConfig.PROJECT_LAST_ACTIVITY_AT)) {
    filters.push({
      filtered: {
        filter: {
          range: {
            lastActivityAt: {
              gte: scriptConfig.PROJECT_LAST_ACTIVITY_AT,
            },
          },
        },
      },
    });
  }
  const searchCriteria = {
    index: ES_PROJECT_INDEX,
    type: ES_PROJECT_TYPE,
    body: {
      query: {
        bool: {
          must: filters,
        },
      },
    },
  };
  return searchCriteria;
}

/**
 * Get handlebars template.
 *
 * @returns {Object} the template
 */
function getTemplate() {
  handlebars.registerHelper('getValue', (data, key) => data[key]);
  handlebars.registerHelper('toJSON', obj => JSON.stringify(obj, null, 2));
  const template = handlebars.compile(fs.readFileSync(path.join(__dirname, 'report.mustache')).toString());
  return template;
}

/**
 * Get ES data.
 *
 * @returns {Promise} the ES data
 */
async function getESData() {
  const searchCriteria = getESSearchCriteria();
  return es.search(searchCriteria)
    .then((docs) => {
      const rows = lodash.map(docs.hits.hits, single => single._source);     // eslint-disable-line no-underscore-dangle
      return rows;
    });
}

/**
 * Get DB data.
 *
 * @returns {Promise} the DB data
 */
async function getDBData() {
  const filter = {};
  if (!lodash.isNil(scriptConfig.PROJECT_START_ID)) {
    filter.id = { $between: [scriptConfig.PROJECT_START_ID, scriptConfig.PROJECT_END_ID] };
  }
  if (!lodash.isNil(scriptConfig.PROJECT_LAST_ACTIVITY_AT)) {
    filter.lastActivityAt = { $gte: scriptConfig.PROJECT_LAST_ACTIVITY_AT };
  }
  return models.Project.findAll({
    where: filter,
    raw: false,
    include: [{
      model: models.ProjectPhase,
      as: 'phases',
      include: [{
        model: models.PhaseProduct,
        as: 'products',
      }],
    }, {
      model: models.ProjectMemberInvite,
      as: 'invites',
      where: { status: { $in: [INVITE_STATUS.PENDING, INVITE_STATUS.REQUESTED] } },
      required: false,
    }, {
      model: models.ProjectAttachment,
      as: 'attachments',
    }],
  }).then((_projects) => {
    const projects = _projects.map((_project) => {
      if (!_project) {
        return Promise.resolve(null);
      }
      const project = _project.toJSON();
      return models.ProjectMember.getActiveProjectMembers(project.id)
        .then((currentProjectMembers) => {
          project.members = currentProjectMembers;
          return project;
        });
    });
    return Promise.all(projects);
  }).then(projects => JSON.parse(JSON.stringify(projects)));
}

/**
 * Main function.
 *
 * @returns {Promise} void
 */
async function main() {
  const esData = await getESData();
  const dbData = await getDBData();
  const template = getTemplate();
  const data = compareProjects(esData, dbData);
  const report = template(data);
  fs.writeFileSync(reportPathname, report);
  console.log(`report is written to ${reportPathname}`);
}

main().then(() => {
  console.log('done!');
  process.exit();
}).catch((err) => {
  console.log(err.message);
  process.exit();
});
