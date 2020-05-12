/* eslint-disable no-console */
/* eslint-disable no-param-reassign */
/*
 * Compare data between DB and ES and generate a report to be uploaded
 * to AWS S3.
 */

import Joi from 'joi';
import lodash from 'lodash';
import config from 'config';
import AWS from 'aws-sdk';
import moment from 'moment';

import models from '../../src/models';
import util from '../../src/util';
import { INVITE_STATUS } from '../../src/constants';

const handlebars = require('handlebars');
const path = require('path');
const fs = require('fs');
const { compareMetadata } = require('./compareMetadata');
const { compareProjects } = require('./compareProjects');
const scriptConstants = require('./constants');

const scriptConfig = {
  PROJECT_START_ID: process.env.PROJECT_START_ID,
  PROJECT_END_ID: process.env.PROJECT_END_ID,
  PROJECT_LAST_ACTIVITY_AT: process.env.PROJECT_LAST_ACTIVITY_AT,
  REPORT_S3_BUCKET: process.env.REPORT_S3_BUCKET,
};

const reportPathname = './report.html';

const configSchema = Joi.object().keys({
  PROJECT_START_ID: Joi.number().integer().positive().optional(),
  PROJECT_END_ID: Joi.number().integer().positive().optional(),
  PROJECT_LAST_ACTIVITY_AT: Joi.date().optional(),
  REPORT_S3_BUCKET: Joi.string().optional(),
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
const ES_METADATA_INDEX = config.get('elasticsearchConfig.metadataIndexName');
const ES_METADATA_TYPE = config.get('elasticsearchConfig.metadataDocType');
const ES_TIMELINE_INDEX = config.get('elasticsearchConfig.timelineIndexName');
const ES_TIMELINE_TYPE = config.get('elasticsearchConfig.timelineDocType');

/**
 * Get es search criteria.
 *
 * @returns {Object} the search criteria
 */
function getESSearchCriteriaForProject() {
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
  handlebars.registerHelper('describeKind', (kind) => {
    if (kind === 'modify') {
      return 'values differ';
    }
    if (kind === 'add') {
      return 'missed in DB';
    }
    if (kind === 'delete') {
      return 'missed in ES';
    }
    return 'unknown';
  });
  const template = handlebars.compile(fs.readFileSync(path.join(__dirname, 'report.handlebars')).toString());
  return template;
}

/**
 * Get product timelines from ES.
 *
 * @returns {Promise} the ES data
 */
async function getProductTimelinesFromES() {
  const searchCriteria = {
    index: ES_TIMELINE_INDEX,
    type: ES_TIMELINE_TYPE,
    body: {
      query: {
        match_phrase: {
          reference: 'product',
        },
      },
    },
  };
  return es.search(searchCriteria)
    .then((docs) => {
      const rows = lodash.map(docs.hits.hits, single => single._source); // eslint-disable-line no-underscore-dangle
      return rows;
    });
}

/**
 * Get projects from ES.
 *
 * @returns {Promise} the ES data
 */
async function getProjectsFromES() {
  const searchCriteria = getESSearchCriteriaForProject();
  const projects = await es.search(searchCriteria)
    .then((docs) => {
      const rows = lodash.map(docs.hits.hits, single => single._source); // eslint-disable-line no-underscore-dangle
      return rows;
    });
  const timelines = await getProductTimelinesFromES();
  const timelinesGroup = lodash.groupBy(timelines, 'referenceId');
  lodash.map(projects, (project) => {
    lodash.map(project.phases, (phase) => {
      lodash.map(phase.products, (product) => {
        product.timeline = lodash.get(timelinesGroup, [product.id, '0']) || null;
      });
    });
  });
  return projects;
}

/**
 * Get metadata from ES.
 *
 * @returns {Promise} the ES data
 */
async function getMetadataFromES() {
  const searchCriteria = {
    index: ES_METADATA_INDEX,
    type: ES_METADATA_TYPE,
  };
  return es.search(searchCriteria)
    .then((docs) => {
      const rows = lodash.map(docs.hits.hits, single => single._source); // eslint-disable-line no-underscore-dangle
      if (!rows.length) {
        return lodash.reduce(
          Object.keys(scriptConstants.associations.metadata),
          (result, modleName) => { result[modleName] = []; },
          {},
        );
      }
      return rows[0];
    });
}

/**
 * Get projects from DB.
 *
 * @returns {Promise} the DB data
 */
async function getProjectsFromDB() {
  const filter = {};
  if (!lodash.isNil(scriptConfig.PROJECT_START_ID)) {
    filter.id = { $between: [scriptConfig.PROJECT_START_ID, scriptConfig.PROJECT_END_ID] };
  }
  if (!lodash.isNil(scriptConfig.PROJECT_LAST_ACTIVITY_AT)) {
    filter.lastActivityAt = { $gte: new Date(scriptConfig.PROJECT_LAST_ACTIVITY_AT).toISOString() };
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
        }).then(() => {
          const promises = [];
          lodash.map(project.phases, (phase) => {
            lodash.map(phase.products, (product) => {
              promises.push(
                models.Timeline.findOne({
                  where: {
                    reference: 'product',
                    referenceId: product.id,
                  },
                  include: [{
                    model: models.Milestone,
                    as: 'milestones',
                  }],
                }).then((timeline) => {
                  product.timeline = timeline || null;
                }),
              );
            });
          });
          return Promise.all(promises)
            .then(() => project);
        });
    });
    return Promise.all(projects);
  }).then(projects => JSON.parse(JSON.stringify(projects)));
}

/**
 * Get metadata from DB.
 *
 * @returns {Promise} the DB data
 */
async function getMetadataFromDB() {
  const metadataAssociations = scriptConstants.associations.metadata;
  const results = await Promise.all(lodash.map(
    Object.values(metadataAssociations),
    modelName => models[modelName].findAll(),
  ));
  return lodash.zipObject(Object.keys(metadataAssociations), JSON.parse(JSON.stringify(results)));
}

/**
 * Main function.
 *
 * @returns {Promise} void
 */
async function main() {
  console.log('Processing Project...');
  const projectsFromDB = await getProjectsFromDB();
  const projectsFromES = await getProjectsFromES();
  const dataForProject = compareProjects(projectsFromDB, projectsFromES);
  console.log('Processing Metadata...');
  const metadataFromDB = await getMetadataFromDB();
  const metadataFromES = await getMetadataFromES();
  const dataForMetadata = compareMetadata(metadataFromDB, metadataFromES);
  const template = getTemplate();
  const report = template({
    metadata: dataForMetadata,
    project: dataForProject,
  });

  if (scriptConfig.REPORT_S3_BUCKET) {
    console.log('Uploading report to S3...');
    // Make sure set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY in Environment Variables
    const s3 = new AWS.S3();

    const fileName =
      `es-db-report-${process.env.NODE_ENV}-${moment().format('YYYY-MM-DD-HH-MM-SS')}.html`;

    const params = {
      Bucket: scriptConfig.REPORT_S3_BUCKET,
      Key: fileName,
      Body: report,
      ContentType: 'text/html',
    };

    await new Promise((resolve, reject) => {
      s3.putObject(params, (error) => {
        if (error) {
          reject(error);
        } else {
          console.log(`Report uploaded successfully on S3. FileName is: ${fileName}`);
          resolve();
        }
      });
    });
  } else {
    console.log('Saving report to disk...');
    fs.writeFileSync(reportPathname, report);
    console.log(`Report is written to local file ${reportPathname}`);
  }
}

main().then(() => {
  console.log('done!');
  process.exit();
}).catch((err) => {
  console.log(err.message);
  process.exit();
});
