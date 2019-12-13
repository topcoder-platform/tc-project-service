
/* globals Promise */

import _ from 'lodash';
import config from 'config';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import models from '../../models';
import util from '../../util';

const ES_PROJECT_INDEX = config.get('elasticsearchConfig.indexName');
const ES_PROJECT_TYPE = config.get('elasticsearchConfig.docType');

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
const PROJECT_MEMBER_INVITE_ATTRIBUTES = _.without(_.keys(models.ProjectMemberInvite.rawAttributes), 'deletedAt');
const PROJECT_ATTACHMENT_ATTRIBUTES = _.without(_.keys(models.ProjectAttachment.rawAttributes), 'deletedAt');

/**
 * Parse the ES search criteria and prepare search request body
 *
 * @param  {projctId}   projectId             the projectId from url
 * @param  {fields}     fields            the fields from url
 * @return {Object}                       search request body that can be passed to .search api call
 */
const parseElasticSearchCriteria = (projectId, fields) => {
  const searchCriteria = {
    index: ES_PROJECT_INDEX,
    type: ES_PROJECT_TYPE,
  };

  let sourceInclude;
  if (_.get(fields, 'projects', null)) {
    sourceInclude = _.get(fields, 'projects');
  }
  if (_.get(fields, 'project_members', null)) {
    const memberFields = _.get(fields, 'project_members');
    sourceInclude = sourceInclude.concat(_.map(memberFields, single => `members.${single}`));
  }
  if (_.get(fields, 'project_member_invites', null)) {
    const memberFields = _.get(fields, 'project_member_invites');
    sourceInclude = sourceInclude.concat(_.map(memberFields, single => `invites.${single}`));
  }

  if (_.get(fields, 'attachments', null)) {
    const attachmentFields = _.get(fields, 'attachments');
    sourceInclude = sourceInclude.concat(_.map(attachmentFields, single => `attachments.${single}`));
  }

  if (sourceInclude) {
    searchCriteria._sourceInclude = sourceInclude;        // eslint-disable-line no-underscore-dangle
  }


  const body = {
    query: {
      bool: {
        filter: [
          {
            term: {
              id: projectId,
            },
          },
        ],
      },
    },
  };
  searchCriteria.body = body;
  return searchCriteria;
};

const retrieveProjectFromES = (projectId, req) => {
  // parse the fields string to determine what fields are to be returned
  let fields = req.query.fields;
  fields = fields ? fields.split(',') : [];
  fields = util.parseFields(fields, {
    projects: PROJECT_ATTRIBUTES,
    project_members: PROJECT_MEMBER_ATTRIBUTES,
    project_member_invites: PROJECT_MEMBER_INVITE_ATTRIBUTES,
    attachments: PROJECT_ATTACHMENT_ATTRIBUTES,
  });

  const searchCriteria = parseElasticSearchCriteria(projectId, fields) || {};
  return new Promise((accept, reject) => {
    const es = util.getElasticSearchClient();
    es.search(searchCriteria).then((docs) => {
      const rows = _.map(docs.hits.hits, single => single._source);     // eslint-disable-line no-underscore-dangle
      accept(rows[0]);
    }).catch(reject);
  });
};

const retrieveProjectFromDB = (projectId, req) => {
  let project;
  let fields = req.query.fields;
  fields = fields ? fields.split(',') : [];
  fields = util.parseFields(fields, {
    projects: PROJECT_ATTRIBUTES,
    project_members: PROJECT_MEMBER_ATTRIBUTES,
  });
  return models.Project
    .findOne({
      where: { id: projectId },
      attributes: _.get(fields, 'projects', null),
      raw: true,
    }).then((_project) => {
      project = _project;
      if (!project) {
          // returning 404
        const apiErr = new Error(`project not found for id ${projectId}`);
        apiErr.status = 404;
        return Promise.reject(apiErr);
      }
        // check context for project members
      project.members = _.map(req.context.currentProjectMembers, m => _.pick(m, fields.project_members));
        // check if attachments field was requested
      if (!req.query.fields || _.indexOf(req.query.fields, 'attachments') > -1) {
        return util.getProjectAttachments(req, project.id);
      }
          // return null if attachments were not requested.
      return Promise.resolve(null);
    })
      .then((attachments) => {
        // if attachments were requested
        if (attachments) {
          project.attachments = attachments;
        }
        return models.ProjectMemberInvite.getPendingAndReguestedInvitesForProject(projectId);
      })
      .then((invites) => {
        project.invites = invites;
        return project;
      });
};


module.exports = [
  permissions('project.view'),
  /**
   * GET projects/{projectId}
   * Get a project by id
   */
  (req, res, next) => {
    const projectId = Number(req.params.projectId);
      // parse the fields string to determine what fields are to be returned

    return retrieveProjectFromES(projectId, req).then((result) => {
      if (result === undefined) {
        req.log.debug('No project found in ES');
        return retrieveProjectFromDB(projectId, req);
      }
      req.log.debug('Project found in ES');
      return result;
    }).then((project) => {
      res.status(200).json(util.maskInviteEmails('$.invites[?(@.email)]', project, req));
    })
      .catch(err => next(err));
  },
];
