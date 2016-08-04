'use strict'

const Authorizer = require('tc-core-library-js').Authorizer

module.exports = () => {
  Authorizer.setDeniedStatusCode(403)

  // anyone can create a project
  Authorizer.setPolicy('project.create', true)
  Authorizer.setPolicy('project.view', require('./project.edit'))
  Authorizer.setPolicy('project.edit', require('./project.edit'))
  Authorizer.setPolicy('project.addMember', require('./project.edit'))
  Authorizer.setPolicy('project.removeMember', require('./project.edit'))
  Authorizer.setPolicy('project.addAttachment', require('./project.edit'))
  Authorizer.setPolicy('project.removeAttachment', require('./project.edit'))
}
