/* eslint-disable valid-jsdoc */

import _ from 'lodash';
import {
  PROJECT_STATUS,
  INVITE_STATUS,
  PROJECT_MEMBER_ROLE,
  PROJECT_MEMBER_NON_CUSTOMER_ROLES,
} from '../constants';

module.exports = function defineProject(sequelize, DataTypes) {
  const Project = sequelize.define('Project', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    directProjectId: DataTypes.BIGINT,
    billingAccountId: DataTypes.BIGINT,
    name: { type: DataTypes.STRING, allowNull: false },
    description: DataTypes.TEXT,
    external: DataTypes.JSON,
    bookmarks: DataTypes.JSON,
    utm: { type: DataTypes.JSON, allowNull: true },
    estimatedPrice: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    actualPrice: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    terms: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: false,
      defaultValue: [],
    },
    groups: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: false,
      defaultValue: [],
    },
    type: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: [_.values(PROJECT_STATUS)],
      },
    },
    details: { type: DataTypes.JSON },
    challengeEligibility: DataTypes.JSON,
    cancelReason: DataTypes.STRING,
    templateId: DataTypes.BIGINT,
    deletedAt: { type: DataTypes.DATE, allowNull: true },
    createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    deletedBy: DataTypes.BIGINT,
    createdBy: { type: DataTypes.INTEGER, allowNull: false },
    updatedBy: { type: DataTypes.INTEGER, allowNull: false },
    version: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'v3' },
    lastActivityAt: { type: DataTypes.DATE, allowNull: false },
    // we use string for `lastActivityUserId` because it comes in Kafka messages payloads
    // and can be not only user id but also `coderbot`, `system` or some kind of autopilot bot id in the future
    lastActivityUserId: { type: DataTypes.STRING, allowNull: false },
  }, {
    tableName: 'projects',
    paranoid: true,
    timestamps: true,
    updatedAt: 'updatedAt',
    createdAt: 'createdAt',
    deletedAt: 'deletedAt',
    indexes: [
      { fields: ['createdAt'] },
      { fields: ['name'] },
      { fields: ['type'] },
      { fields: ['status'] },
      { fields: ['directProjectId'] },
    ],
  });

  Project.associate = (models) => {
    Project.hasMany(models.ProjectMember, { as: 'members', foreignKey: 'projectId' });
    Project.hasMany(models.ProjectAttachment, { as: 'attachments', foreignKey: 'projectId' });
    Project.hasMany(models.ProjectPhase, { as: 'phases', foreignKey: 'projectId' });
    Project.hasMany(models.ProjectMemberInvite, { as: 'invites', foreignKey: 'projectId' });
    Project.hasMany(models.ScopeChangeRequest, { as: 'scopeChangeRequests', foreignKey: 'projectId' });
    Project.hasMany(models.WorkStream, { as: 'workStreams', foreignKey: 'projectId' });
    Project.hasMany(models.CopilotRequest, { as: 'copilotRequests', foreignKey: 'projectId' });
    Project.hasMany(models.CopilotOpportunity, { as: 'copilotOpportunity', foreignKey: 'projectId' });
  };

  /**
   * Get direct project id
   * @param id the id of project
   */
  Project.getDirectProjectId = id => Project.findByPk(id, {
    attributes: ['directProjectId'],
    raw: true,
  })
    .then(res => res.directProjectId);


  const ORDERABLE_COLUMNS = [
    'createdAt',
    'updatedAt',
    'lastActivityAt',
    'id',
    'status',
    'name',
    'type',
  ];

  const normalizeArrayFilter = (value) => {
    if (_.isNil(value)) {
      return [];
    }
    if (_.isObject(value) && _.has(value, '$in')) {
      return normalizeArrayFilter(value.$in);
    }

    return _
      .chain(value)
      .thru(v => (_.isArray(v) ? v : [v]))
      .filter(v => !_.isNil(v))
      .value();
  };

  const stripMatchingQuotes = (value) => {
    if (!_.isString(value) || value.length < 2) {
      return value;
    }
    const firstChar = value[0];
    const lastChar = value[value.length - 1];
    if ((firstChar === '"' && lastChar === '"') || (firstChar === '\'' && lastChar === '\'')) {
      return value.substring(1, value.length - 1);
    }
    return value;
  };

  const buildKeywordFilter = (keyword) => {
    if (!_.isString(keyword)) {
      return null;
    }
    let term = _.trim(keyword);
    if (!term) {
      return null;
    }

    const toSearchTerm = value => (_.isString(value) && _.trim(value)
      ? _.toLower(_.trim(value)) : null);

    if (_.startsWith(_.toLower(term), 'ref:')) {
      let code = term.substring(4);
      code = _.trim(stripMatchingQuotes(code));
      if (!code) {
        return null;
      }
      return {
        clause: 'LOWER(details -> \'utm\' ->> \'code\') = LOWER(:keywordRef)',
        replacements: { keywordRef: code },
        searchTerm: toSearchTerm(code),
      };
    }

    const quoted = (
      (term.startsWith('"') && term.endsWith('"')) ||
      (term.startsWith('\'') && term.endsWith('\''))
    );
    if (quoted) {
      term = stripMatchingQuotes(term);
      if (!term) {
        return null;
      }
      return {
        clause: 'projects."projectFullText" ~* :keywordExact',
        replacements: { keywordExact: _.escapeRegExp(term) },
        searchTerm: toSearchTerm(term),
      };
    }

    const hasWildcard = term.indexOf('*') !== -1;
    const patternSegments = _.map(term.split('*'), part => _.escapeRegExp(part));
    let pattern = patternSegments.join('.*');
    if (!hasWildcard) {
      pattern = `.*${pattern}.*`;
    }
    const sanitizedTerm = _.trim(term.replace(/\*/g, ' '));

    return {
      clause: 'projects."projectFullText" ~* :keywordWildcard',
      replacements: { keywordWildcard: pattern },
      searchTerm: toSearchTerm(sanitizedTerm || term.replace(/\*/g, '')),
    };
  };

  /**
   * Search keyword in name, description, details.utm.code (To be deprecated)
   * @param parameters the parameters
   *          - filters: the filters contains keyword
   *          - order: the order
   *          - limit: the limit
   *          - offset: the offset
   *          - attributes: the attributes to get
   * @param log the request log
   * @return the result rows and count
   */
  Project.searchText = async (parameters, log) => {
    const filters = _.get(parameters, 'filters', {});
    const replacements = {};
    const whereParts = ['1=1', 'projects."deletedAt" IS NULL'];
    const joins = [];
    const bestMatchSort = Boolean(parameters.bestMatchSort);
    let keywordSearchTerm = null;

    const appendJoin = (joinStr) => {
      if (!joins.includes(joinStr)) {
        joins.push(joinStr);
      }
    };

    if (_.has(filters, 'id')) {
      const idFilter = filters.id;
      if (_.isArray(idFilter)) {
        if (!idFilter.length) {
          return { rows: [], count: 0 };
        }
        whereParts.push('projects.id IN (:id)');
        replacements.id = idFilter;
      } else if (_.isObject(idFilter) && _.has(idFilter, '$in')) {
        if (!idFilter.$in.length) {
          return { rows: [], count: 0 };
        }
        whereParts.push('projects.id IN (:id)');
        replacements.id = idFilter.$in;
      } else if (_.isString(idFilter) || _.isNumber(idFilter)) {
        whereParts.push('projects.id = :id');
        replacements.id = idFilter;
      }
    }

    if (_.has(filters, 'status')) {
      const statusFilter = filters.status;
      if (_.isObject(statusFilter) && _.has(statusFilter, '$in')) {
        whereParts.push('projects.status IN (:status)');
        replacements.status = statusFilter.$in;
      } else if (_.isArray(statusFilter)) {
        if (!statusFilter.length) {
          return { rows: [], count: 0 };
        }
        whereParts.push('projects.status IN (:status)');
        replacements.status = statusFilter;
      } else if (_.isString(statusFilter)) {
        whereParts.push('projects.status = :status');
        replacements.status = statusFilter;
      }
    }

    if (_.has(filters, 'type')) {
      whereParts.push('projects.type = :type');
      replacements.type = filters.type;
    }

    if (_.has(filters, 'keyword')) {
      const keywordClause = buildKeywordFilter(filters.keyword);
      if (keywordClause) {
        whereParts.push(keywordClause.clause);
        _.assign(replacements, keywordClause.replacements);
        if (keywordClause.searchTerm) {
          keywordSearchTerm = keywordClause.searchTerm;
        }
      }
    }

    if (_.has(filters, 'name')) {
      whereParts.push('projects.name = :name');
      replacements.name = filters.name;
    }

    if (_.has(filters, 'directProjectId')) {
      whereParts.push('projects."directProjectId" = :directProjectId');
      replacements.directProjectId = filters.directProjectId;
    }

    if (_.has(filters, 'code')) {
      whereParts.push('details -> \'utm\' ->> \'code\' = :code');
      replacements.code = filters.code;
    }

    const customerUserIds = normalizeArrayFilter(filters.customerUserIds);
    if (!_.isNil(filters.customerUserIds) && !customerUserIds.length) {
      return { rows: [], count: 0 };
    }
    if (customerUserIds.length) {
      appendJoin(`INNER JOIN project_members AS customerMembers
        ON projects.id = customerMembers."projectId"
        AND customerMembers."deletedAt" IS NULL
        AND customerMembers.role = :customerRole`);
      whereParts.push('customerMembers."userId" IN (:customerUserIds)');
      replacements.customerUserIds = customerUserIds;
      replacements.customerRole = PROJECT_MEMBER_ROLE.CUSTOMER;
    }

    const managerUserIds = normalizeArrayFilter(filters.managerUserIds);
    if (!_.isNil(filters.managerUserIds) && !managerUserIds.length) {
      return { rows: [], count: 0 };
    }
    if (managerUserIds.length) {
      appendJoin(`INNER JOIN project_members AS managerMembers
        ON projects.id = managerMembers."projectId"
        AND managerMembers."deletedAt" IS NULL
        AND managerMembers.role IN (:managerRoles)`);
      whereParts.push('managerMembers."userId" IN (:managerUserIds)');
      replacements.managerUserIds = managerUserIds;
      replacements.managerRoles = PROJECT_MEMBER_NON_CUSTOMER_ROLES;
    }

    if (_.has(filters, 'userId') || _.has(filters, 'email')) {
      appendJoin(`LEFT OUTER JOIN project_members AS members
        ON projects.id = members."projectId"
        AND members."deletedAt" IS NULL`);
      appendJoin(`LEFT OUTER JOIN project_member_invites AS invites
        ON projects.id = invites."projectId"
        AND invites."deletedAt" IS NULL`);

      const membershipClauses = [];
      const inviteStatusClause = 'invites.status IN (:INVITE_STATUSES)';
      if (_.has(filters, 'userId')) {
        membershipClauses.push('members."userId" = :filterUserId');
        membershipClauses.push(`(
          ${inviteStatusClause} AND
          invites."userId" = :filterUserId
        )`);
        replacements.filterUserId = filters.userId;
      }
      if (_.has(filters, 'email')) {
        membershipClauses.push(`(
          ${inviteStatusClause} AND
          LOWER(invites."email") = LOWER(:filterEmail)
        )`);
        replacements.filterEmail = filters.email;
      }

      if (membershipClauses.length) {
        replacements.INVITE_STATUSES = [
          INVITE_STATUS.PENDING,
          INVITE_STATUS.REQUESTED,
        ];
        whereParts.push(`(${membershipClauses.join(' OR ')})`);
      }
    }

    const attributes = _.isArray(parameters.attributes)
      ? _.clone(parameters.attributes)
      : [];
    if (!attributes.length) {
      attributes.push('id');
    }
    if (!attributes.includes('id')) {
      attributes.push('id');
    }
    const attributesStr = attributes
      .map(attr => `projects."${attr}"`)
      .join(', ');

    const order = _.get(parameters, 'order[0]', ['createdAt', 'asc']);
    let orderColumn = _.get(order, '[0]', 'createdAt');
    let orderDirection = _.get(order, '[1]', 'asc');
    if (!ORDERABLE_COLUMNS.includes(orderColumn)) {
      orderColumn = 'createdAt';
    }
    orderDirection = _.toUpper(orderDirection) === 'DESC' ? 'DESC' : 'ASC';
    let orderClause = `projects."${orderColumn}" ${orderDirection}`;
    if (bestMatchSort && keywordSearchTerm) {
      replacements.keywordSimilarity = keywordSearchTerm;
      orderClause = 'similarity(projects."projectFullText", :keywordSimilarity) DESC, projects."id" DESC';
    }

    const joinClause = joins.length ? ` ${joins.join(' ')}` : '';
    const whereClause = whereParts.join(' AND ');

    const countResult = await sequelize.query(
      `SELECT COUNT(DISTINCT projects.id) AS count FROM projects AS projects${joinClause}
        WHERE ${whereClause}`,
      {
        type: sequelize.QueryTypes.SELECT,
        replacements,
        logging: (str) => { log.debug(str); },
        raw: true,
      },
    );
    const count = countResult.length ? Number(countResult[0].count) : 0;

    const limitParam = _.get(parameters, 'limit');
    const offsetParam = _.get(parameters, 'offset', 0);
    const hasPagination = !_.isNil(limitParam);
    if (hasPagination) {
      replacements.limit = Number(limitParam);
      replacements.offset = Number(offsetParam) || 0;
    }
    const paginationClause = hasPagination ? 'LIMIT :limit OFFSET :offset' : '';

    const rows = await sequelize.query(
      `SELECT ${attributesStr} FROM projects AS projects${joinClause}
        WHERE ${whereClause}
        GROUP BY projects.id
        ORDER BY ${orderClause}
        ${paginationClause}`,
      {
        type: sequelize.QueryTypes.SELECT,
        replacements,
        logging: (str) => { log.debug(str); },
        raw: true,
      },
    );

    return { rows, count };
  };

  Project.findProjectRange = (models, startId, endId, fields, raw = true) => Project.findAll({
    where: { id: { $between: [startId, endId] } },
    attributes: _.get(fields, 'projects', null),
    raw,
    include: [{
      model: models.ProjectPhase,
      as: 'phases',
      order: [['startDate', 'asc']],
      // where: phasesWhere,
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
  });

  return Project;
};
