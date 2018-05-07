
/* globals Promise */

import _ from 'lodash';
import config from 'config';
import Promise from 'bluebird';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import models from '../../models';
import util from '../../util';

/**
/**
 * API to handle retrieving a single project by id
 *
 * Permissions:
 * Only users that have access to the project can retrieve it.
 *
 */

// var permissions = require('tc-core-library-js').middleware.permissions
const permissions = tcMiddleware.permissions;
const PROJECT_ATTRIBUTES = _.without(_.keys(models.Project.rawAttributes), 'utm', 'deletedAt');
const PROJECT_MEMBER_ATTRIBUTES = _.without(_.keys(models.ProjectMember.rawAttributes), 'deletedAt');
const ES_PROJECT_INDEX = config.get('elasticsearchConfig.indexName');
const ES_PROJECT_TYPE = config.get('elasticsearchConfig.docType');

module.exports = [
  permissions('project.admin'),
  /**
   * GET projects/{projectId}
   * Get a project by id
   */
  (req, res, next) => {
    const logger = req.log;
    logger.debug('Entered Admin#index');
    const projectIdStart = Number(req.body.param.projectIdStart);
    const projectIdEnd = Number(req.body.param.projectIdEnd);
    const indexName = _.get(req, 'body.param.indexName', ES_PROJECT_INDEX);
    const docType = _.get(req, 'body.param.docType', ES_PROJECT_TYPE);
    logger.debug('projectIdStart', projectIdStart);
    logger.debug('projectIdEnd', projectIdEnd);
    logger.debug('indexName', indexName);
    logger.debug('docType', docType);
    let fields = req.query.fields;
    fields = fields ? fields.split(',') : [];
      // parse the fields string to determine what fields are to be returned
    fields = util.parseFields(fields, {
      projects: PROJECT_ATTRIBUTES,
      project_members: PROJECT_MEMBER_ATTRIBUTES,
    });

    const eClient = util.getElasticSearchClient();
    return models.Project.findProjectRange(projectIdStart, projectIdEnd, fields)
    .then((_projects) => {
      const projects = _projects.map((_project) => {
        const project = _project;
        if (!project) {
          return Promise.resolve(null);
        }
        return models.ProjectMember.getActiveProjectMembers(project.id)
        .then((currentProjectMembers) => {
          // check context for project members
          project.members = _.map(currentProjectMembers, m => _.pick(m, fields.project_members));

          const userIds = project.members ? project.members.map(single => `userId:${single.userId}`) : [];
          return util.getMemberDetailsByUserIds(userIds, logger, req.id)
          .then((memberDetails) => {
            // update project member record with details
            project.members = project.members.map((single) => {
              const detail = _.find(memberDetails, md => md.userId === single.userId);
              return _.merge(single, _.pick(detail, 'handle', 'firstName', 'lastName', 'email'));
            });
            return Promise.delay(1000).return(project);
          })
          .catch((error) => {
            logger.error(`Error in getting project member details for (projectId: ${project.id})`, error);
            return null;
          });
        })
        .catch((error) => {
          logger.error(`Error in getting project active members (projectId: ${project.id})`, error);
          return null;
        });
      });
      Promise.all(projects).then((projectResponses) => {
        const body = [];
        projectResponses.map((p) => {
          if (p) {
            body.push({ index: { _index: indexName, _type: docType, _id: p.id } });
            body.push(p);
          }
          // dummy return
          return p;
        });
        logger.debug('body.length', body.length);
        if (body.length > 0) {
          logger.trace('body[0]', body[0]);
          logger.trace('body[length-1]', body[body.length - 1]);
        }

        res.status(200).json(util.wrapResponse(req.id, {
          message: `Reindex request successfully submitted for ${body.length / 2} projects`,
        }));
        // bulk index
        eClient.bulk({
          body,
        })
        .then((result) => {
          logger.debug(`project indexed successfully (projectId: ${projectIdStart}-${projectIdEnd})`, result);
        })
        .catch((error) => {
          logger.error(`Error in indexing project (projectId: ${projectIdStart}-${projectIdEnd})`, error);
        });
      }).catch((error) => {
        logger.error(
          `Error in getting project details for indexing (projectId: ${projectIdStart}-${projectIdEnd})`,
        error);
      });
    })
    .catch(err => next(err));
  },
];
