/* eslint-disable global-require,no-await-in-loop,no-console,no-restricted-syntax */
const _ = require('lodash');
const config = require('config');
const coreLib = require('tc-core-library-js');
const apiTestLib = require('tc-api-testing-lib');
const helper = require('./envHelper');

const logger = coreLib.logger({
  name: 'newman tests',
  level: _.get(config, 'logLevel', 'debug').toLowerCase(),
  captureLogs: config.get('captureLogs'),
  logentriesToken: _.get(config, 'logentriesToken', null),
});

const requests = [
  {
    folder: 'create project type by admin',
    iterationData: require('./testData/project-type/create-project-type-by-admin.json'),
  },
  {
    folder: 'create project type by m2m',
    iterationData: require('./testData/project-type/create-project-type-by-m2m.json'),
  },
  {
    folder: 'create project type with all kinds of invalid request body',
    iterationData: require('./testData/project-type/create-project-type-with-invalid-data.json'),
  },
  {
    folder: 'create project type with all kinds of invalid token',
    iterationData: require('./testData/project-type/create-project-type-with-invalid-tokens.json'),
  },
  {
    folder: 'list project types by admin',
    iterationData: require('./testData/project-type/list-project-types.json'),
  },
  {
    folder: 'list project types by m2m',
    iterationData: require('./testData/project-type/list-project-types.json'),
  },
  {
    folder: 'list project types by copilot',
    iterationData: require('./testData/project-type/list-project-types.json'),
  },
  {
    folder: 'list project types by user',
    iterationData: require('./testData/project-type/list-project-types.json'),
  },
  {
    folder: 'list project types with all kinds of invalid token',
    iterationData: require('./testData/project-type/list-project-types-with-invalid-tokens.json'),
  },
  {
    folder: 'get project type by admin',
    iterationData: require('./testData/project-type/get-project-type.json'),
  },
  {
    folder: 'get project type by m2m',
    iterationData: require('./testData/project-type/get-project-type.json'),
  },
  {
    folder: 'get project type by copilot',
    iterationData: require('./testData/project-type/get-project-type.json'),
  },
  {
    folder: 'get project type by user',
    iterationData: require('./testData/project-type/get-project-type.json'),
  },
  {
    folder: 'get project type with invalid requests',
    iterationData: require('./testData/project-type/get-project-type-with-invalid-parameters.json'),
  },
  {
    folder: 'get project type with all kinds of invalid token',
    iterationData: require('./testData/project-type/get-project-type-with-invalid-tokens.json'),
  },
  {
    folder: 'patch project type by admin',
    iterationData: require('./testData/project-type/patch-project-type-by-admin.json'),
  },
  {
    folder: 'patch project type by m2m',
    iterationData: require('./testData/project-type/patch-project-type-by-m2m.json'),
  },
  {
    folder: 'patch project type with all kinds of invalid request body',
    iterationData: require('./testData/project-type/patch-project-type-with-invalid-data.json'),
  },
  {
    folder: 'patch project type with all kinds of invalid token',
    iterationData: require('./testData/project-type/patch-project-type-with-invalid-tokens.json'),
  },
  {
    folder: 'delete project type by admin',
  },
  {
    folder: 'delete project type by m2m',
  },
  {
    folder: 'delete project type with all kinds of invalid request',
    iterationData: require('./testData/project-type/delete-project-type-with-invalid-request.json'),
  },
  {
    folder: 'create project by admin',
    iterationData: require('./testData/project/create-project-by-admin.json'),
  },
  {
    folder: 'create project by m2m',
    iterationData: require('./testData/project/create-project-by-m2m.json'),
  },
  {
    folder: 'create project by copilot',
    iterationData: require('./testData/project/create-project-by-copilot.json'),
  },
  {
    folder: 'create project with all kinds of invalid request body',
    iterationData: require('./testData/project/create-project-with-invalid-data.json'),
  },
  {
    folder: 'create project with all kinds of invalid token',
    iterationData: require('./testData/project/create-project-with-invalid-tokens.json'),
  },
  {
    folder: 'list projects by admin',
    iterationData: require('./testData/project/list-projects.json'),
  },
  {
    folder: 'list projects by m2m',
    iterationData: require('./testData/project/list-projects.json'),
  },
  {
    folder: 'list projects by copilot',
    iterationData: require('./testData/project/list-projects.json'),
  },
  {
    folder: 'list projects by user',
    iterationData: require('./testData/project/list-projects.json'),
  },
  {
    folder: 'list projects with various parameters',
    iterationData: require('./testData/project/list-projects-with-various-parameters.json'),
  },
  {
    folder: 'list projects with invalid parameters',
    iterationData: require('./testData/project/list-projects-with-invalid-parameters.json'),
  },
  {
    folder: 'list projects with all kinds of invalid token',
    iterationData: require('./testData/project/list-projects-with-invalid-tokens.json'),
  },
  {
    folder: 'get project by admin',
    iterationData: require('./testData/project/get-project.json'),
  },
  {
    folder: 'get project by m2m',
    iterationData: require('./testData/project/get-project.json'),
  },
  {
    folder: 'get project by copilot',
    iterationData: require('./testData/project/get-project.json'),
  },
  {
    folder: 'get project with invalid requests',
    iterationData: require('./testData/project/get-project-with-invalid-parameters.json'),
  },
  {
    folder: 'get project with all kinds of invalid token',
    iterationData: require('./testData/project/get-project-with-invalid-tokens.json'),
  },
  {
    folder: 'patch project by admin',
    iterationData: require('./testData/project/patch-project-by-admin.json'),
  },
  {
    folder: 'patch project by m2m',
    iterationData: require('./testData/project/patch-project-by-m2m.json'),
  },
  {
    folder: 'patch project by copilot',
    iterationData: require('./testData/project/patch-project-by-copilot.json'),
  },
  {
    folder: 'patch project with all kinds of invalid request body',
    iterationData: require('./testData/project/patch-project-with-invalid-data.json'),
  },
  {
    folder: 'patch project with all kinds of invalid token',
    iterationData: require('./testData/project/patch-project-with-invalid-tokens.json'),
  },
  {
    folder: 'delete project by admin',
  },
  {
    folder: 'delete project by m2m',
  },
  {
    folder: 'delete project by copilot',
  },
  {
    folder: 'delete project with all kinds of invalid request',
    iterationData: require('./testData/project/delete-project-with-invalid-request.json'),
  },
  {
    folder: 'upgrade project type by admin',
    iterationData: require('./testData/project/upgrade-project-by-admin.json'),
  },
  {
    folder: 'upgrade project type by m2m',
    iterationData: require('./testData/project/upgrade-project-by-m2m.json'),
  },
  {
    folder: 'upgrade project with all kinds of invalid request body',
    iterationData: require('./testData/project/upgrade-project-with-invalid-data.json'),
  },
  {
    folder: 'upgrade project with all kinds of invalid token',
    iterationData: require('./testData/project/upgrade-project-with-invalid-tokens.json'),
  },
  {
    folder: 'create project attachment by admin',
    iterationData: require('./testData/project-attachment/create-project-attachment-with-link-by-admin.json'),
  },
  {
    folder: 'create project attachment by m2m',
    iterationData: require('./testData/project-attachment/create-project-attachment-with-link-by-m2m.json'),
  },
  {
    folder: 'create project attachment by copilot',
    iterationData: require('./testData/project-attachment/create-project-attachment-with-link-by-copilot.json'),
  },
  // {
  //   folder: 'create project attachment by admin',
  //   iterationData: require('./testData/project-attachment/create-project-attachment-with-file-by-admin.json'),
  // },
  // {
  //   folder: 'create project attachment by m2m',
  //   iterationData: require('./testData/project-attachment/create-project-attachment-with-file-by-m2m.json'),
  // },
  // {
  //   folder: 'create project attachment by copilot',
  //   iterationData: require('./testData/project-attachment/create-project-attachment-with-file-by-copilot.json'),
  // },
  {
    folder: 'create project attachment with all kinds of invalid request body',
    iterationData: require('./testData/project-attachment/create-project-attachment-with-invalid-data.json'),
  },
  {
    folder: 'create project attachment with all kinds of invalid token',
    iterationData: require('./testData/project-attachment/create-project-attachment-with-invalid-tokens.json'),
  },
  {
    folder: 'list project attachments by admin',
    iterationData: require('./testData/project-attachment/list-project-attachments.json'),
  },
  {
    folder: 'list project attachments by m2m',
    iterationData: require('./testData/project-attachment/list-project-attachments.json'),
  },
  {
    folder: 'list project attachments by copilot',
    iterationData: require('./testData/project-attachment/list-project-attachments.json'),
  },
  {
    folder: 'list project attachments with all kinds of invalid token',
    iterationData: require('./testData/project-attachment/list-project-attachments-with-invalid-tokens.json'),
  },
  {
    folder: 'get project attachment by admin',
    iterationData: require('./testData/project-attachment/get-project-attachment.json'),
  },
  {
    folder: 'get project attachment by m2m',
    iterationData: require('./testData/project-attachment/get-project-attachment.json'),
  },
  {
    folder: 'get project attachment by copilot',
    iterationData: require('./testData/project-attachment/get-project-attachment.json'),
  },
  {
    folder: 'get project attachment with invalid requests',
    iterationData: require('./testData/project-attachment/get-project-attachment-with-invalid-parameters.json'),
  },
  {
    folder: 'get project attachment with all kinds of invalid token',
    iterationData: require('./testData/project-attachment/get-project-attachment-with-invalid-tokens.json'),
  },
  {
    folder: 'patch project attachment by admin',
    iterationData: require('./testData/project-attachment/patch-project-attachment-by-admin.json'),
  },
  {
    folder: 'patch project attachment by m2m',
    iterationData: require('./testData/project-attachment/patch-project-attachment-by-m2m.json'),
  },
  {
    folder: 'patch project attachment by copilot',
    iterationData: require('./testData/project-attachment/patch-project-attachment-by-copilot.json'),
  },
  {
    folder: 'patch project attachment with all kinds of invalid request body',
    iterationData: require('./testData/project-attachment/patch-project-attachment-with-invalid-data.json'),
  },
  {
    folder: 'patch project attachment with all kinds of invalid token',
    iterationData: require('./testData/project-attachment/patch-project-attachment-with-invalid-tokens.json'),
  },
  {
    folder: 'delete project attachment by admin',
    iterationData: require('./testData/project-attachment/delete-project-attachment-by-admin.json'),
  },
  {
    folder: 'delete project attachment by m2m',
    iterationData: require('./testData/project-attachment/delete-project-attachment-by-m2m.json'),
  },
  {
    folder: 'delete project attachment by copilot',
    iterationData: require('./testData/project-attachment/delete-project-attachment-by-copilot.json'),
  },
  {
    folder: 'delete project attachment with all kinds of invalid request',
    iterationData: require('./testData/project-attachment/delete-project-attachment-with-invalid-request.json'),
  },
  {
    folder: 'create project member by admin',
    iterationData: require('./testData/project-member/create-project-member-by-admin.json'),
  },
  {
    folder: 'create project member by m2m',
    iterationData: require('./testData/project-member/create-project-member-by-m2m.json'),
  },
  {
    folder: 'create project member with all kinds of invalid request body',
    iterationData: require('./testData/project-member/create-project-member-with-invalid-data.json'),
  },
  {
    folder: 'create project member with all kinds of invalid token',
    iterationData: require('./testData/project-member/create-project-member-with-invalid-tokens.json'),
  },
  {
    folder: 'list project members by admin',
    iterationData: require('./testData/project-member/list-project-members.json'),
  },
  {
    folder: 'list project members by m2m',
    iterationData: require('./testData/project-member/list-project-members.json'),
  },
  {
    folder: 'list project members by copilot',
    iterationData: require('./testData/project-member/list-project-members.json'),
  },
  {
    folder: 'list project members by user',
    iterationData: require('./testData/project-member/list-project-members.json'),
  },
  {
    folder: 'list project members with invalid parameters',
    iterationData: require('./testData/project-member/list-project-members-with-invalid-parameters.json'),
  },
  {
    folder: 'list project members with all kinds of invalid token',
    iterationData: require('./testData/project-member/list-project-members-with-invalid-tokens.json'),
  },
  {
    folder: 'get project member by admin',
    iterationData: require('./testData/project-member/get-project-member.json'),
  },
  {
    folder: 'get project member by m2m',
    iterationData: require('./testData/project-member/get-project-member.json'),
  },
  {
    folder: 'get project member by copilot',
    iterationData: require('./testData/project-member/get-project-member.json'),
  },
  {
    folder: 'get project member by user',
    iterationData: require('./testData/project-member/get-project-member.json'),
  },
  {
    folder: 'get project member with invalid requests',
    iterationData: require('./testData/project-member/get-project-member-with-invalid-parameters.json'),
  },
  {
    folder: 'get project member with all kinds of invalid token',
    iterationData: require('./testData/project-member/get-project-member-with-invalid-tokens.json'),
  },
  {
    folder: 'patch project member by admin',
    iterationData: require('./testData/project-member/patch-project-member-by-admin.json'),
  },
  {
    folder: 'patch project member by m2m',
    iterationData: require('./testData/project-member/patch-project-member-by-m2m.json'),
  },
  {
    folder: 'patch project member by copilot',
    iterationData: require('./testData/project-member/patch-project-member-by-copilot.json'),
  },
  {
    folder: 'patch project member with all kinds of invalid request body',
    iterationData: require('./testData/project-member/patch-project-member-with-invalid-data.json'),
  },
  {
    folder: 'patch project member with all kinds of invalid token',
    iterationData: require('./testData/project-member/patch-project-member-with-invalid-tokens.json'),
  },
  {
    folder: 'delete project member by admin',
    iterationData: require('./testData/project-member/delete-project-member-by-admin.json'),
  },
  {
    folder: 'delete project member by m2m',
    iterationData: require('./testData/project-member/delete-project-member-by-m2m.json'),
  },
  {
    folder: 'delete project member with all kinds of invalid request',
    iterationData: require('./testData/project-member/delete-project-member-with-invalid-request.json'),
  },
  {
    folder: 'create project phase by admin',
    iterationData: require('./testData/project-phase/create-project-phase-by-admin.json'),
  },
  {
    folder: 'create project phase by copilot',
    iterationData: require('./testData/project-phase/create-project-phase-by-copilot.json'),
  },
  {
    folder: 'create project phase with all kinds of invalid request body',
    iterationData: require('./testData/project-phase/create-project-phase-with-invalid-data.json'),
  },
  {
    folder: 'create project phase with all kinds of invalid token',
    iterationData: require('./testData/project-phase/create-project-phase-with-invalid-tokens.json'),
  },
  {
    folder: 'list project phases by admin',
    iterationData: require('./testData/project-phase/list-project-phases.json'),
  },
  {
    folder: 'list project phases by m2m',
    iterationData: require('./testData/project-phase/list-project-phases.json'),
  },
  {
    folder: 'list project phases by copilot',
    iterationData: require('./testData/project-phase/list-project-phases.json'),
  },
  {
    folder: 'list project phases by user',
    iterationData: require('./testData/project-phase/list-project-phases-by-user.json'),
  },
  {
    folder: 'list project phases with invalid parameters',
    iterationData: require('./testData/project-phase/list-project-phases-with-invalid-data.json'),
  },
  {
    folder: 'list project phases with all kinds of invalid token',
    iterationData: require('./testData/project-phase/list-project-phases-with-invalid-tokens.json'),
  },
  {
    folder: 'get project phase by admin',
    iterationData: require('./testData/project-phase/get-project-phase.json'),
  },
  {
    folder: 'get project phase by m2m',
    iterationData: require('./testData/project-phase/get-project-phase.json'),
  },
  {
    folder: 'get project phase by user',
    iterationData: require('./testData/project-phase/get-project-phase.json'),
  },
  {
    folder: 'get project phase with invalid requests',
    iterationData: require('./testData/project-phase/get-project-phase-with-invalid-parameters.json'),
  },
  {
    folder: 'get project phase with all kinds of invalid token',
    iterationData: require('./testData/project-phase/get-project-phase-with-invalid-tokens.json'),
  },
  {
    folder: 'patch project phase by admin',
    iterationData: require('./testData/project-phase/patch-project-phase-by-admin.json'),
  },
  {
    folder: 'patch project phase by copilot',
    iterationData: require('./testData/project-phase/patch-project-phase-by-copilot.json'),
  },
  {
    folder: 'patch project phase with all kinds of invalid request body',
    iterationData: require('./testData/project-phase/patch-project-phase-with-invalid-data.json'),
  },
  {
    folder: 'patch project phase with all kinds of invalid token',
    iterationData: require('./testData/project-phase/patch-project-phase-with-invalid-tokens.json'),
  },
  {
    folder: 'delete project phase by admin',
    iterationData: require('./testData/project-phase/delete-project-phase-by-admin.json'),
  },
  {
    folder: 'delete project phase by copilot',
    iterationData: require('./testData/project-phase/delete-project-phase-by-copilot.json'),
  },
  {
    folder: 'delete project phase with all kinds of invalid request',
    iterationData: require('./testData/project-phase/delete-project-phase-with-invalid-request.json'),
  },
  {
    folder: 'create project workstream by admin',
    iterationData: require('./testData/workstream/create-project-workstream-by-admin.json'),
  },
  {
    folder: 'create project workstream by m2m',
    iterationData: require('./testData/workstream/create-project-workstream-by-m2m.json'),
  },
  {
    folder: 'create project workstream with all kinds of invalid request body',
    iterationData: require('./testData/workstream/create-project-workstream-with-invalid-data.json'),
  },
  {
    folder: 'create project workstream with all kinds of invalid token',
    iterationData: require('./testData/workstream/create-project-workstream-with-invalid-tokens.json'),
  },
  {
    folder: 'list project workstreams by admin',
    iterationData: require('./testData/workstream/list-project-workstreams.json'),
  },
  {
    folder: 'list project workstreams by m2m',
    iterationData: require('./testData/workstream/list-project-workstreams.json'),
  },
  {
    folder: 'list project workstreams by user',
    iterationData: require('./testData/workstream/list-project-workstreams.json'),
  },
  {
    folder: 'list project workstreams with all kinds of invalid data',
    iterationData: require('./testData/workstream/list-project-workstreams-with-invalid-data.json'),
  },
  {
    folder: 'list project workstreams with all kinds of invalid token',
    iterationData: require('./testData/workstream/list-project-workstreams-with-invalid-tokens.json'),
  },
  {
    folder: 'get project workstream by admin',
    iterationData: require('./testData/workstream/get-project-workstream.json'),
  },
  {
    folder: 'get project workstream by m2m',
    iterationData: require('./testData/workstream/get-project-workstream.json'),
  },
  {
    folder: 'get project workstream by user',
    iterationData: require('./testData/workstream/get-project-workstream.json'),
  },
  {
    folder: 'get project workstream with invalid requests',
    iterationData: require('./testData/workstream/get-project-workstream-with-invalid-parameters.json'),
  },
  {
    folder: 'get project workstream with all kinds of invalid token',
    iterationData: require('./testData/workstream/get-project-workstream-with-invalid-tokens.json'),
  },
  {
    folder: 'patch project workstream by admin',
    iterationData: require('./testData/workstream/patch-project-workstream-by-admin.json'),
  },
  {
    folder: 'patch project workstream with all kinds of invalid request body',
    iterationData: require('./testData/workstream/patch-project-workstream-with-invalid-data.json'),
  },
  {
    folder: 'patch project workstream with all kinds of invalid token',
    iterationData: require('./testData/workstream/patch-project-workstream-with-invalid-tokens.json'),
  },
  {
    folder: 'delete project workstream by admin',
    iterationData: require('./testData/workstream/delete-project-workstream-by-admin.json'),
  },
  {
    folder: 'delete project workstream by m2m',
    iterationData: require('./testData/workstream/delete-project-workstream-by-m2m.json'),
  },
  {
    folder: 'delete project workstream with all kinds of invalid request',
    iterationData: require('./testData/workstream/delete-project-workstream-with-invalid-request.json'),
  },
  {
    folder: 'create project work by admin',
    iterationData: require('./testData/work/create-project-work-by-admin.json'),
  },
  {
    folder: 'create project work with all kinds of invalid request body',
    iterationData: require('./testData/work/create-project-work-with-invalid-data.json'),
  },
  {
    folder: 'create project work with all kinds of invalid token',
    iterationData: require('./testData/work/create-project-work-with-invalid-tokens.json'),
  },
  {
    folder: 'list project works by admin',
    iterationData: require('./testData/work/list-project-works.json'),
  },
  {
    folder: 'list project works by m2m',
    iterationData: require('./testData/work/list-project-works.json'),
  },
  {
    folder: 'list project works by user',
    iterationData: require('./testData/work/list-project-works.json'),
  },
  {
    folder: 'list project works with all kinds of invalid data',
    iterationData: require('./testData/work/list-project-works-with-invalid-data.json'),
  },
  {
    folder: 'list project works with all kinds of invalid token',
    iterationData: require('./testData/work/list-project-works-with-invalid-tokens.json'),
  },
  {
    folder: 'get project work by admin',
    iterationData: require('./testData/work/get-project-work.json'),
  },
  {
    folder: 'get project work by m2m',
    iterationData: require('./testData/work/get-project-work.json'),
  },
  {
    folder: 'get project work by user',
    iterationData: require('./testData/work/get-project-work.json'),
  },
  {
    folder: 'get project work with invalid requests',
    iterationData: require('./testData/work/get-project-work-with-invalid-parameters.json'),
  },
  {
    folder: 'get project work with all kinds of invalid token',
    iterationData: require('./testData/work/get-project-work-with-invalid-tokens.json'),
  },
  {
    folder: 'patch project work by admin',
    iterationData: require('./testData/work/patch-project-work-by-admin.json'),
  },
  {
    folder: 'patch project work with all kinds of invalid request body',
    iterationData: require('./testData/work/patch-project-work-with-invalid-data.json'),
  },
  {
    folder: 'patch project work with all kinds of invalid token',
    iterationData: require('./testData/work/patch-project-work-with-invalid-tokens.json'),
  },
  {
    folder: 'delete project work by admin',
    iterationData: require('./testData/work/delete-project-work-by-admin.json'),
  },
  {
    folder: 'delete project work with all kinds of invalid request',
    iterationData: require('./testData/work/delete-project-work-with-invalid-request.json'),
  },
  {
    folder: 'create project work item by admin',
    iterationData: require('./testData/work-item/create-project-work-item-by-admin.json'),
  },
  {
    folder: 'create project work item with all kinds of invalid request body',
    iterationData: require('./testData/work-item/create-project-work-item-with-invalid-data.json'),
  },
  {
    folder: 'create project work item with all kinds of invalid token',
    iterationData: require('./testData/work-item/create-project-work-item-with-invalid-tokens.json'),
  },
  {
    folder: 'list project work items by admin',
    iterationData: require('./testData/work-item/list-project-work-items.json'),
  },
  {
    folder: 'list project work items by m2m',
    iterationData: require('./testData/work-item/list-project-work-items.json'),
  },
  {
    folder: 'list project work items by user',
    iterationData: require('./testData/work-item/list-project-work-items.json'),
  },
  {
    folder: 'list project work items with all kinds of invalid data',
    iterationData: require('./testData/work-item/list-project-work-items-with-invalid-data.json'),
  },
  {
    folder: 'list project work items with all kinds of invalid token',
    iterationData: require('./testData/work-item/list-project-work-items-with-invalid-tokens.json'),
  },
  {
    folder: 'get project work item by admin',
    iterationData: require('./testData/work-item/get-project-work-item.json'),
  },
  {
    folder: 'get project work item by m2m',
    iterationData: require('./testData/work-item/get-project-work-item.json'),
  },
  {
    folder: 'get project work item by user',
    iterationData: require('./testData/work-item/get-project-work-item.json'),
  },
  {
    folder: 'get project work item with invalid requests',
    iterationData: require('./testData/work-item/get-project-work-item-with-invalid-parameters.json'),
  },
  {
    folder: 'get project work item with all kinds of invalid token',
    iterationData: require('./testData/work-item/get-project-work-item-with-invalid-tokens.json'),
  },
  {
    folder: 'patch project work item by admin',
    iterationData: require('./testData/work-item/patch-project-work-item-by-admin.json'),
  },
  {
    folder: 'patch project work item with all kinds of invalid request body',
    iterationData: require('./testData/work-item/patch-project-work-item-with-invalid-data.json'),
  },
  {
    folder: 'patch project work item with all kinds of invalid token',
    iterationData: require('./testData/work-item/patch-project-work-item-with-invalid-tokens.json'),
  },
  {
    folder: 'delete project work item by admin',
    iterationData: require('./testData/work-item/delete-project-work-item-by-admin.json'),
  },
  {
    folder: 'delete project work item with all kinds of invalid request',
    iterationData: require('./testData/work-item/delete-project-work-item-with-invalid-request.json'),
  },
  {
    folder: 'create project setting by admin',
    iterationData: require('./testData/project-setting/create-project-setting-by-admin.json'),
  },
  {
    folder: 'create project setting by m2m',
    iterationData: require('./testData/project-setting/create-project-setting-by-m2m.json'),
  },
  {
    folder: 'create project setting with all kinds of invalid request body',
    iterationData: require('./testData/project-setting/create-project-setting-with-invalid-data.json'),
  },
  {
    folder: 'create project setting with all kinds of invalid token',
    iterationData: require('./testData/project-setting/create-project-setting-with-invalid-tokens.json'),
  },
  {
    folder: 'list project settings by admin',
    iterationData: require('./testData/project-setting/list-project-settings-admin-and-m2m.json'),
  },
  {
    folder: 'list project settings by m2m',
    iterationData: require('./testData/project-setting/list-project-settings-admin-and-m2m.json'),
  },
  {
    folder: 'list project settings by copilot',
    iterationData: require('./testData/project-setting/list-project-settings-copilot.json'),
  },
  {
    folder: 'list project settings by user',
    iterationData: require('./testData/project-setting/list-project-settings-user.json'),
  },
  {
    folder: 'list project settings with all kinds of invalid data',
    iterationData: require('./testData/project-setting/list-project-settings-with-invalid-data.json'),
  },
  {
    folder: 'list project settings with all kinds of invalid token',
    iterationData: require('./testData/project-setting/list-project-settings-with-invalid-tokens.json'),
  },
  {
    folder: 'patch project setting by admin',
    iterationData: require('./testData/project-setting/patch-project-setting-by-admin.json'),
  },
  {
    folder: 'patch project setting with all kinds of invalid request body',
    iterationData: require('./testData/project-setting/patch-project-setting-with-invalid-data.json'),
  },
  {
    folder: 'patch project setting with all kinds of invalid token',
    iterationData: require('./testData/project-setting/patch-project-setting-with-invalid-tokens.json'),
  },
  {
    folder: 'delete project setting by admin',
    iterationData: require('./testData/project-setting/delete-project-setting-by-admin.json'),
  },
  {
    folder: 'delete project setting by m2m',
    iterationData: require('./testData/project-setting/delete-project-setting-by-m2m.json'),
  },
  {
    folder: 'delete project setting with all kinds of invalid request',
    iterationData: require('./testData/project-setting/delete-project-setting-with-invalid-request.json'),
  },
  {
    folder: 'list project estimation items with all kinds of invalid data',
    iterationData: require(
      './testData/project-estimation-item/list-project-estimation-items-with-invalid-parameters.json'),
  },
  {
    folder: 'list project estimation items with all kinds of invalid token',
    iterationData: require('./testData/project-estimation-item/list-project-settings-with-invalid-tokens.json'),
  },
  {
    folder: 'create project phase product by admin',
    iterationData: require('./testData/phase-product/create-project-phase-product-by-admin.json'),
  },
  {
    folder: 'create project phase product by m2m',
    iterationData: require('./testData/phase-product/create-project-phase-product-by-m2m.json'),
  },
  {
    folder: 'create project phase product by copilot',
    iterationData: require('./testData/phase-product/create-project-phase-product-by-copilot.json'),
  },
  {
    folder: 'create project phase product with all kinds of invalid request body',
    iterationData: require('./testData/phase-product/create-project-phase-product-with-invalid-data.json'),
  },
  {
    folder: 'create project phase product with all kinds of invalid token',
    iterationData: require('./testData/phase-product/create-project-phase-product-with-invalid-tokens.json'),
  },
  {
    folder: 'list project phase products by admin',
    iterationData: require('./testData/phase-product/list-project-phase-products.json'),
  },
  {
    folder: 'list project phase products by m2m',
    iterationData: require('./testData/phase-product/list-project-phase-products.json'),
  },
  {
    folder: 'list project phase products by user',
    iterationData: require('./testData/phase-product/list-project-phase-products.json'),
  },
  {
    folder: 'list project phase products with all kinds of invalid data',
    iterationData: require('./testData/phase-product/list-project-phase-products-with-invalid-data.json'),
  },
  {
    folder: 'list project phase products with all kinds of invalid token',
    iterationData: require('./testData/phase-product/list-project-phase-products-with-invalid-tokens.json'),
  },
  {
    folder: 'get project phase product by admin',
    iterationData: require('./testData/phase-product/get-project-phase-product.json'),
  },
  {
    folder: 'get project phase product by m2m',
    iterationData: require('./testData/phase-product/get-project-phase-product.json'),
  },
  {
    folder: 'get project phase product by user',
    iterationData: require('./testData/phase-product/get-project-phase-product.json'),
  },
  {
    folder: 'get project phase product with invalid requests',
    iterationData: require('./testData/phase-product/get-project-phase-product-with-invalid-parameters.json'),
  },
  {
    folder: 'get project phase product with all kinds of invalid token',
    iterationData: require('./testData/phase-product/get-project-phase-product-with-invalid-tokens.json'),
  },
  {
    folder: 'patch project phase product by admin',
    iterationData: require('./testData/phase-product/patch-project-phase-product-by-admin.json'),
  },
  {
    folder: 'patch project phase product with all kinds of invalid request body',
    iterationData: require('./testData/phase-product/patch-project-phase-product-with-invalid-data.json'),
  },
  {
    folder: 'patch project phase product with all kinds of invalid token',
    iterationData: require('./testData/phase-product/patch-project-phase-product-with-invalid-tokens.json'),
  },
  {
    folder: 'delete project phase product by admin',
    iterationData: require('./testData/phase-product/delete-project-phase-product-by-admin.json'),
  },
  {
    folder: 'delete project phase product with all kinds of invalid request',
    iterationData: require('./testData/phase-product/delete-project-phase-product-with-invalid-request.json'),
  },
  {
    folder: 'list project metadata by admin',
    iterationData: require('./testData/metadata/list-project-metadata.json'),
  },
  {
    folder: 'list project metadata by m2m',
    iterationData: require('./testData/metadata/list-project-metadata.json'),
  },
  {
    folder: 'list project metadata by copilot',
    iterationData: require('./testData/metadata/list-project-metadata.json'),
  },
  {
    folder: 'list project metadata by user',
    iterationData: require('./testData/metadata/list-project-metadata.json'),
  },
  {
    folder: 'list project metadata with all kinds of invalid token',
    iterationData: require('./testData/metadata/list-project-metadata-with-invalid-tokens.json'),
  },
];

/**
 * Clear the test data.
 * @return {Promise<void>} Returns a promise
 */
async function clearTestData() {
  logger.info('Clear the Postman test data.');
  await helper.postRequest(`${config.AUTOMATED_TESTING_SITE_PREFIX}/projects/internal/jobs/clean`);
  logger.info('Finished clear the Postman test data.');
}

/**
 * Run the postman tests.
 */
apiTestLib.runTests(requests, require.resolve('./project-api.postman_collection.json'),
  require.resolve('./project-api.postman_environment.json')).then(async () => {
  logger.info('newman test completed!');
  await clearTestData();
}).catch(async (err) => {
  logger.error(err);
  // Only calling the clean up function when it is not validation error.
  if (err.name !== 'ValidationError') {
    await clearTestData();
  }
});
