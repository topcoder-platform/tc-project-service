import _ from 'lodash';
import { middleware as tcMiddleware } from 'tc-core-library-js';

import models from '../../models';
import util from '../../util';
import { INVITE_STATUS } from '../../constants';
import { PERMISSION } from '../../permissions/constants';
import permissionUtils from '../../utils/permissions';

const permissions = tcMiddleware.permissions;
const PROJECT_ATTRIBUTES = _.without(_.keys(models.Project.rawAttributes), 'utm', 'deletedAt');
const PROJECT_MEMBER_ATTRIBUTES = _.without(
  _.keys(models.ProjectMember.rawAttributes),
  'deletedAt',
);
const PROJECT_MEMBER_ALLOWED_FIELDS = _.concat(PROJECT_MEMBER_ATTRIBUTES, ['handle']);
const PROJECT_MEMBER_INVITE_ATTRIBUTES = _.without(
  _.keys(models.ProjectMemberInvite.rawAttributes),
  'deletedAt',
);
const PROJECT_ATTACHMENT_ATTRIBUTES = _.without(
  _.keys(models.ProjectAttachment.rawAttributes),
  'deletedAt',
);
const PROJECT_PHASE_ATTRIBUTES = _.without(
  _.keys(models.ProjectPhase.rawAttributes),
  'deletedAt',
);
const PROJECT_PHASE_PRODUCTS_ATTRIBUTES = _.without(
  _.keys(models.PhaseProduct.rawAttributes),
  'deletedAt',
);

const MEMBER_DETAIL_FIELDS = ['handle', 'firstName', 'lastName', 'email'];

const filterProjectInvites = (project, req) => {
  if (!project.invites) {
    return;
  }
  if (util.hasPermissionByReq(PERMISSION.READ_PROJECT_INVITE_NOT_OWN, req)) {
    return;
  }
  const canSeeOwn = util.hasPermissionByReq(PERMISSION.READ_PROJECT_INVITE_OWN, req);
  if (!canSeeOwn) {
    project.invites = [];
    return;
  }
  const currentUserId = req.authUser.userId;
  const currentUserEmail = req.authUser.email ? req.authUser.email.toLowerCase() : null;
  project.invites = project.invites.filter((invite) => {
    if (invite.userId && invite.userId === currentUserId) {
      return true;
    }
    if (invite.email && currentUserEmail &&
      invite.email.toLowerCase() === currentUserEmail) {
      return true;
    }
    return false;
  });
};

const applyMemberDetails = async (project, requestedFields, req) => {
  if (!requestedFields || !requestedFields.length || !project.members) {
    return;
  }
  if (!util.hasPermission(PERMISSION.READ_PROJECT_MEMBER, req.authUser, project.members)) {
    delete project.members;
    return;
  }

  const detailFields = _.intersection(requestedFields, MEMBER_DETAIL_FIELDS);
  if (detailFields.length) {
    const userIds = _(project.members).map('userId').filter(Boolean).uniq().value();
    const memberDetails = userIds.length
      ? await util.getMemberDetailsByUserIds(userIds, req.log, req.id)
      : [];
    const detailsById = _.keyBy(memberDetails || [], 'userId');
    project.members = project.members.map((member) => {
      const memberCopy = _.clone(member);
      const details = detailsById[memberCopy.userId];
      if (details) {
        detailFields.forEach((field) => {
          if (_.has(details, field)) {
            memberCopy[field] = details[field];
          }
        });
      }
      return memberCopy;
    });
  }

  if (requestedFields.indexOf('userId') === -1) {
    project.members.forEach((member) => {
      delete member.userId;
    });
  }
};

const retrieveProject = async (projectId, req) => {
  const queryFields = req.query.fields ? req.query.fields.split(',') : [];
  const fields = util.parseFields(queryFields, {
    projects: PROJECT_ATTRIBUTES,
    project_members: util.hasPermissionByReq(PERMISSION.READ_PROJECT_MEMBER, req)
      ? util.addUserDetailsFieldsIfAllowed(PROJECT_MEMBER_ALLOWED_FIELDS, req) : null,
    project_member_invites: PROJECT_MEMBER_INVITE_ATTRIBUTES,
    project_phases: PROJECT_PHASE_ATTRIBUTES,
    project_phases_products: PROJECT_PHASE_PRODUCTS_ATTRIBUTES,
    attachments: PROJECT_ATTACHMENT_ATTRIBUTES,
  });

  if (_.indexOf(fields.projects, 'id') < 0) {
    fields.projects.push('id');
  }

  const include = [];
  if (fields.project_members && fields.project_members.length) {
    let memberAttributes = _.intersection(fields.project_members, PROJECT_MEMBER_ATTRIBUTES);
    if (!memberAttributes.length) {
      memberAttributes = ['userId', 'role'];
    }
    if (memberAttributes.indexOf('userId') === -1) {
      memberAttributes.push('userId');
    }
    include.push({
      model: models.ProjectMember,
      as: 'members',
      attributes: memberAttributes,
      required: false,
      where: { deletedAt: { $eq: null } },
    });
  }
  if (fields.project_member_invites && fields.project_member_invites.length) {
    include.push({
      model: models.ProjectMemberInvite,
      as: 'invites',
      attributes: fields.project_member_invites,
      required: false,
      where: {
        status: { $in: [INVITE_STATUS.PENDING, INVITE_STATUS.REQUESTED] },
        deletedAt: { $eq: null },
      },
    });
  }
  if (fields.project_phases && fields.project_phases.length) {
    const phaseInclude = {
      model: models.ProjectPhase,
      as: 'phases',
      attributes: fields.project_phases,
      required: false,
      where: { deletedAt: { $eq: null } },
    };
    if (fields.project_phases_products && fields.project_phases_products.length) {
      phaseInclude.include = [{
        model: models.PhaseProduct,
        as: 'products',
        attributes: fields.project_phases_products,
        required: false,
        where: { deletedAt: { $eq: null } },
      }];
    }
    include.push(phaseInclude);
  }

  const projectInstance = await models.Project.findOne({
    where: { id: projectId },
    attributes: fields.projects,
    include,
    raw: false,
  });

  if (!projectInstance) {
    const err = new Error(`project not found for id ${projectId}`);
    err.status = 404;
    throw err;
  }

  const project = projectInstance.get({ plain: true });
  if (project.phases) {
    project.phases = _.orderBy(project.phases, ['startDate', 'id'], ['asc', 'asc']);
  }

  if (fields.project_members && fields.project_members.length) {
    await applyMemberDetails(project, fields.project_members, req);
  }

  if (project.invites) {
    filterProjectInvites(project, req);
  }

  const retrieveAttachments = !req.query.fields || req.query.fields.indexOf('attachments') > -1;
  if (retrieveAttachments) {
    const attachmentFields = fields.attachments && fields.attachments.length
      ? fields.attachments
      : PROJECT_ATTACHMENT_ATTRIBUTES;
    const attachments = await util.getProjectAttachments(req, project.id);
    if (attachments) {
      const permitted = attachments.filter(attachment =>
        permissionUtils.hasReadAccessToAttachment(attachment, req));
      project.attachments = attachmentFields.length
        ? permitted.map(attachment => _.pick(attachment, attachmentFields))
        : permitted;
    } else {
      project.attachments = [];
    }
  }

  return project;
};

module.exports = [
  permissions('project.view'),
  async (req, res, next) => {
    try {
      const projectId = Number(req.params.projectId);
      const project = await retrieveProject(projectId, req);
      const postProcessedProject = util.postProcessInvites('$.invites[?(@.email)]', project, req);
      if (postProcessedProject.attachments) {
        postProcessedProject.attachments = postProcessedProject.attachments.filter(attachment =>
          permissionUtils.hasReadAccessToAttachment(attachment, req),
        );
      }
      return res.status(200).json(postProcessedProject);
    } catch (err) {
      return next(err);
    }
  },
];
