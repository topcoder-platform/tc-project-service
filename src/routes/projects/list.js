import _ from 'lodash';
import config from 'config';

import models from '../../models';
import {
  INVITE_STATUS,
  PROJECT_MEMBER_NON_CUSTOMER_ROLES,
  PROJECT_MEMBER_ROLE,
} from '../../constants';
import util from '../../util';
import { PERMISSION } from '../../permissions/constants';
import permissionUtils from '../../utils/permissions';

const PROJECT_ATTRIBUTES = _.without(_.keys(models.Project.rawAttributes),
  'utm',
  'deletedAt',
);
const PROJECT_MEMBER_ATTRIBUTES = _.without(
  _.keys(models.ProjectMember.rawAttributes),
  'deletedAt',
);
const PROJECT_MEMBER_ALLOWED_FIELDS = _.concat(
  PROJECT_MEMBER_ATTRIBUTES,
  ['handle'],
);
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

const SUPPORTED_FILTERS = [
  'id',
  'status',
  'memberOnly',
  'keyword',
  'type',
  'name',
  'code',
  'customer',
  'manager',
  'directProjectId',
];

const MEMBER_DETAIL_FIELDS = ['handle', 'firstName', 'lastName', 'email'];

const getOrderFromSort = (sort) => {
  if (!sort) {
    return [['createdAt', 'asc']];
  }
  const parts = sort.trim().split(' ');
  if (parts.length === 1) {
    parts.push('asc');
  }
  return [[parts[0], parts[1]]];
};

const buildMemberSearchRegex = (value) => {
  const trimmed = _.trim(value || '');
  if (!trimmed) {
    return null;
  }
  const escaped = trimmed.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
  const hasWildcard = trimmed.indexOf('*') !== -1;
  let pattern = escaped.replace(/\\\*/g, '.*');
  if (!hasWildcard) {
    pattern = `.*${pattern}.*`;
  }
  return new RegExp(pattern, 'i');
};

const resolveRoleFilterUserIds = async (req, searchValue, roles, baseFilters = {}) => {
  if (!searchValue) {
    return null;
  }

  const regex = buildMemberSearchRegex(searchValue);
  if (!regex) {
    return null;
  }

  const { rows: candidateProjects } = await models.Project.searchText({
    filters: baseFilters,
    attributes: ['id'],
    order: [['id', 'asc']],
    limit: null,
  }, req.log);

  const projectIds = _.map(candidateProjects, 'id');
  if (!projectIds.length) {
    return [];
  }

  const where = {
    deletedAt: { $eq: null },
    projectId: { $in: projectIds },
  };
  if (_.isArray(roles)) {
    where.role = { $in: roles };
  } else {
    where.role = roles;
  }

  const members = await models.ProjectMember.findAll({
    attributes: [[models.Sequelize.fn('DISTINCT', models.Sequelize.col('userId')), 'userId']],
    where,
    raw: true,
  });

  const userIds = _(members).map('userId').filter(Boolean).uniq().value();
  if (!userIds.length) {
    return [];
  }

  const memberDetails = await util.getMemberDetailsByUserIds(userIds, req.log, req.id) || [];

  const matchedUserIds = _(memberDetails)
    .filter((detail) => {
      const fullName = _.trim([detail.firstName, detail.lastName].filter(Boolean).join(' '));
      return _.some([
        detail.handle,
        detail.firstName,
        detail.lastName,
        fullName,
      ], value => value && regex.test(value));
    })
    .map('userId')
    .filter(Boolean)
    .uniq()
    .value();

  if (!matchedUserIds.length) {
    return [];
  }

  return matchedUserIds;
};

const reorderProjects = (projects, orderedIds) => {
  const map = _.keyBy(projects, 'id');
  return orderedIds.map(id => map[id]).filter(Boolean);
};

const sortPhases = (projects) => {
  projects.forEach((project) => {
    if (project.phases) {
      project.phases = _.orderBy(project.phases, ['startDate', 'id'], ['asc', 'asc']);
    }
  });
};

const loadProjectAttachments = async (projects, attachmentFields, req, shouldLoad) => {
  if (!shouldLoad) {
    return;
  }

  await Promise.all(projects.map(async (project) => {
    const attachments = await util.getProjectAttachments(req, project.id);
    if (!attachments) {
      project.attachments = [];
      return;
    }
    const permitted = attachments.filter(attachment =>
      permissionUtils.hasReadAccessToAttachment(attachment, req));
    project.attachments = attachmentFields.length
      ? permitted.map(attachment => _.pick(attachment, attachmentFields))
      : permitted;
  }));
};

const applyMemberPermissionsAndDetails = async (projects, requestedFields, req) => {
  if (!requestedFields.length) {
    return;
  }

  const detailFields = _.intersection(requestedFields, MEMBER_DETAIL_FIELDS);
  const needDetails = detailFields.length > 0;
  let detailsByUserId = {};

  if (needDetails) {
    const userIds = _(projects)
      .flatMap('members')
      .map('userId')
      .filter(id => !_.isNil(id))
      .uniq()
      .value();
    const memberDetails = userIds.length
      ? await util.getMemberDetailsByUserIds(userIds, req.log, req.id)
      : [];
    detailsByUserId = _.keyBy(memberDetails || [], 'userId');
  }

  const shouldStripUserId = requestedFields.indexOf('userId') === -1;

  projects.forEach((project) => {
    if (!project.members) {
      return;
    }
    if (!util.hasPermission(PERMISSION.READ_PROJECT_MEMBER, req.authUser, project.members)) {
      delete project.members;
      return;
    }
    project.members = project.members.map((member) => {
      const memberCopy = _.clone(member);
      if (needDetails) {
        const detail = detailsByUserId[memberCopy.userId];
        if (detail) {
          detailFields.forEach((field) => {
            if (_.has(detail, field)) {
              memberCopy[field] = detail[field];
            }
          });
        }
      }
      if (shouldStripUserId) {
        delete memberCopy.userId;
      }
      return memberCopy;
    });
  });
};

const filterInvitesByPermission = (projects, req, shouldFilter) => {
  if (!shouldFilter) {
    return;
  }
  if (util.hasPermissionByReq(PERMISSION.READ_PROJECT_INVITE_NOT_OWN, req)) {
    return;
  }

  const canSeeOwn = util.hasPermissionByReq(PERMISSION.READ_PROJECT_INVITE_OWN, req);
  const currentUserId = req.authUser.userId;
  const currentUserEmail = req.authUser.email ? req.authUser.email.toLowerCase() : null;

  projects.forEach((project) => {
    if (!project.invites) {
      return;
    }
    if (!canSeeOwn) {
      project.invites = [];
      return;
    }
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
  });
};

const retrieveProjects = async (req, criteria, sort, ffields, options = {}) => {
  const { bestMatchSort = false } = options;
  const order = getOrderFromSort(sort);
  const queryFields = ffields ? ffields.split(',') : [];
  let fields = util.parseFields(queryFields, {
    projects: PROJECT_ATTRIBUTES,
    project_members: util.addUserDetailsFieldsIfAllowed(PROJECT_MEMBER_ALLOWED_FIELDS, req),
    project_member_invites: PROJECT_MEMBER_INVITE_ATTRIBUTES,
    project_phases: PROJECT_PHASE_ATTRIBUTES,
    project_phases_products: PROJECT_PHASE_PRODUCTS_ATTRIBUTES,
    attachments: PROJECT_ATTACHMENT_ATTRIBUTES,
  });

  if (_.indexOf(fields.projects, 'id') < 0) {
    fields.projects.push('id');
  }

  const baseFilters = _.omit(_.cloneDeep(criteria.filters), ['customer', 'manager']);

  const customerIds = await resolveRoleFilterUserIds(
    req,
    _.get(criteria.filters, 'customer'),
    PROJECT_MEMBER_ROLE.CUSTOMER,
    baseFilters,
  );
  if (_.isArray(customerIds)) {
    if (!customerIds.length) {
      return { rows: [], count: 0, pageSize: criteria.limit, page: criteria.page };
    }
    baseFilters.customerUserIds = customerIds;
  }

  const managerIds = await resolveRoleFilterUserIds(
    req,
    _.get(criteria.filters, 'manager'),
    PROJECT_MEMBER_NON_CUSTOMER_ROLES,
    baseFilters,
  );
  if (_.isArray(managerIds)) {
    if (!managerIds.length) {
      return { rows: [], count: 0, pageSize: criteria.limit, page: criteria.page };
    }
    baseFilters.managerUserIds = managerIds;
  }

  const { rows: baseRows, count } = await models.Project.searchText({
    filters: baseFilters,
    order,
    limit: criteria.limit,
    offset: criteria.offset,
    attributes: fields.projects,
    bestMatchSort,
  }, req.log);

  const projectIds = _.map(baseRows, 'id');
  if (!projectIds.length) {
    return { rows: [], count, pageSize: criteria.limit, page: criteria.page };
  }

  const include = [];
  const retrieveMembers = !req.query.fields || !!fields.project_members.length;
  const retrieveInvites = !req.query.fields || !!fields.project_member_invites.length;
  const retrievePhases = !req.query.fields || !!fields.project_phases.length;
  const retrieveAttachments = !req.query.fields ||
    (req.query.fields && req.query.fields.indexOf('attachments') > -1);

  if (retrieveMembers) {
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

  if (retrieveInvites) {
    const inviteAttributes = fields.project_member_invites.length
      ? fields.project_member_invites
      : PROJECT_MEMBER_INVITE_ATTRIBUTES;
    include.push({
      model: models.ProjectMemberInvite,
      as: 'invites',
      attributes: inviteAttributes,
      required: false,
      where: {
        status: { $in: [INVITE_STATUS.PENDING, INVITE_STATUS.REQUESTED] },
        deletedAt: { $eq: null },
      },
    });
  }

  if (retrievePhases) {
    const phaseAttributes = fields.project_phases.length
      ? fields.project_phases
      : PROJECT_PHASE_ATTRIBUTES;
    const phaseInclude = {
      model: models.ProjectPhase,
      as: 'phases',
      attributes: phaseAttributes,
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

  const detailedProjects = await models.Project.findAll({
    where: { id: { $in: projectIds } },
    attributes: fields.projects,
    include,
    raw: false,
  });
  const orderedProjects = reorderProjects(
    detailedProjects.map(project => project.get({ plain: true })),
    projectIds,
  );

  if (retrievePhases) {
    sortPhases(orderedProjects);
  }

  const attachmentFields = fields.attachments && fields.attachments.length
    ? fields.attachments
    : PROJECT_ATTACHMENT_ATTRIBUTES;
  await loadProjectAttachments(orderedProjects, attachmentFields, req, retrieveAttachments);

  if (retrieveMembers) {
    await applyMemberPermissionsAndDetails(orderedProjects, fields.project_members, req);
  }

  filterInvitesByPermission(orderedProjects, req, retrieveInvites);

  return { rows: orderedProjects, count, pageSize: criteria.limit, page: criteria.page };
};

module.exports = [
  async (req, res, next) => {
    try {
      let filters = _.omit(req.query, 'sort', 'perPage', 'page', 'fields');

      let sort = req.query.sort ? decodeURIComponent(req.query.sort) : 'createdAt';
      if (sort && sort.indexOf(' ') === -1) {
        sort += ' asc';
      }
      const sortableProps = [
        'best match',
        'createdAt', 'createdAt asc', 'createdAt desc',
        'updatedAt', 'updatedAt asc', 'updatedAt desc',
        'lastActivityAt', 'lastActivityAt asc', 'lastActivityAt desc',
        'id', 'id asc', 'id desc',
        'status', 'status asc', 'status desc',
        'name', 'name asc', 'name desc',
        'type', 'type asc', 'type desc',
      ];
      if (!util.isValidFilter(filters, SUPPORTED_FILTERS) ||
        (sort && _.indexOf(sortableProps, sort) < 0)) {
        return util.handleError('Invalid filters or sort', null, req, next);
      }

      const memberOnly = _.get(filters, 'memberOnly', false);
      filters = _.omit(filters, 'memberOnly');

      const hasKeywordFilter = _.isString(filters.keyword) && _.trim(filters.keyword).length > 0;
      let bestMatchSort = false;
      if (sort === 'best match') {
        if (hasKeywordFilter) {
          bestMatchSort = true;
        }
        sort = 'lastActivityAt desc';
      }

      const limit = Math.min(req.query.perPage || config.pageSize, config.pageSize);
      const criteria = {
        filters,
        limit,
        offset: ((req.query.page - 1) * limit) || 0,
        page: req.query.page || 1,
      };
      req.log.info(criteria);

      if (memberOnly === 'true' || !util.hasPermission(PERMISSION.READ_PROJECT_ANY, req.authUser)) {
        criteria.filters.email = req.authUser.email;
        criteria.filters.userId = req.authUser.userId;
      }

      const result = await retrieveProjects(
        req,
        criteria,
        sort,
        req.query.fields,
        { bestMatchSort },
      );
      result.rows.forEach((project) => {
        if (project.attachments) {
          project.attachments = project.attachments.filter(attachment =>
            permissionUtils.hasReadAccessToAttachment(attachment, req));
        }
      });
      const processed = util.postProcessInvites('$.rows[*].invites[?(@.email)]', result, req);
      return util.setPaginationHeaders(req, res, processed);
    } catch (err) {
      return next(err);
    }
  },
];
