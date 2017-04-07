
/* globals Promise */

import _ from 'lodash';
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

module.exports = [
  permissions('project.view'),
  /**
   * GET projects/{projectId}
   * Get a project by id
   */
  (req, res, next) => {
    const projectId = Number(req.params.projectId);
    let fields = req.query.fields;
    fields = fields ? fields.split(',') : [];
      // parse the fields string to determine what fields are to be returned
    fields = util.parseFields(fields, {
      projects: PROJECT_ATTRIBUTES,
      project_members: PROJECT_MEMBER_ATTRIBUTES,
    });
    let project;
    return models.Project
      .find({
        where: { id: projectId },
        attributes: _.get(fields, 'projects', null),
        raw: true,
      })
      .then((_project) => {
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
        res.status(200).json(util.wrapResponse(req.id, project));
      })
      .catch(err => next(err));
  },
];
