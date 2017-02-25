'use strict'

import _ from 'lodash'
import {
  EVENT,
  PROJECT_MEMBER_ROLE
} from '../../constants'
import util from '../../util'
import models from '../../models'
import directProject from '../../services/directProject'


const projectMemberAddedHandler = (logger, msg, channel) => {
  const origRequestId = msg.properties.correlationId
  const newMember = JSON.parse(msg.content.toString())

  if (newMember.role === PROJECT_MEMBER_ROLE.COPILOT) {
    // Add co-pilot when a co-pilot is added to a project
    return models.Project.getDirectProjectId(newMember.projectId)
      .then(directProjectId => {
        if (directProjectId) {
          // retrieve system user token
          return util.getSystemUserToken(logger)
            .then(token => {
              const req = {
                id: origRequestId,
                log: logger,
                headers: {
                  authorization: `Bearer ${token}`
                }
              }
              return directProject.addCopilot(req, directProjectId, {
                  copilotUserId: newMember.userId
                })
                .then(resp => {
                  logger.debug('added copilot to direct')
                    // acknowledge
                  channel.ack(msg)
                })
            })
            .catch(err => {
              logger.error('Error caught while adding co-pilot from direct', err)
              channel.nack(msg, false, false)
            })
        } else {
          logger.info('project not associated with a direct project, skipping')
          channel.ack(msg)
        }
      })
      .catch(err => {
        // if the message has been redelivered dont attempt to reprocess it
        logger.error('Error retrieving project', err, msg)
        channel.nack(msg, false, !msg.fields.redelivered)
      })
  } else if (newMember.role === PROJECT_MEMBER_ROLE.MANAGER) {
    // if manager is added we have to add the manager to direct project
    return models.Project.getDirectProjectId(newMember.projectId)
      .then(directProjectId => {
        if (directProjectId) {
          // retrieve system user token
          return util.getSystemUserToken(logger)
            .then(token => {
              const req = {
                id: origRequestId,
                log: logger,
                headers: {
                  authorization: `Bearer ${token}`
                }
              }
              return directProject.editProjectPermissions(req, directProjectId, {
                  permissions: [
                    {
                      userId: newMember.userId,
                      permissionType: {
                        permissionTypeId: 3,
                        name: 'project_full'
                      },
                      studio: false
                    }
                  ]
                })
                .then(resp => {
                  logger.debug('added manager to direct')
                    // acknowledge
                  channel.ack(msg)
                })
            })
            .catch(err => {
              logger.error('Error caught while adding manager from direct', err)
              channel.nack(msg, false, false)
            })
        } else {
          logger.info('project not associated with a direct project, skipping')
          channel.ack(msg)
        }
      })
      .catch(err => {
        // if the message has been redelivered dont attempt to reprocess it
        logger.error('Error retrieving project', err, msg)
        channel.nack(msg, false, !msg.fields.redelivered)
      })
  } else {
    // nothing to do
    channel.ack(msg)
  }
}

const projectMemberRemovedHandler = (logger, msg, channel) => {
  const origRequestId = msg.properties.correlationId
  const member = JSON.parse(msg.content.toString())

  if (member.role === PROJECT_MEMBER_ROLE.COPILOT) {
    // Delete co-pilot when a co-pilot is deleted from a project
    return models.Project.getDirectProjectId(member.projectId)
      .then(directProjectId => {
        if (directProjectId) {
          // retrieve system user token
          return util.getSystemUserToken(logger)
            .then(token => {
              const req = {
                id: origRequestId,
                log: logger,
                headers: {
                  authorization: `Bearer ${token}`
                }
              }
              return directProject.deleteCopilot(req, directProjectId, {
                  copilotUserId: member.userId
                })
                .then(resp => {
                  logger.debug('removed copilot from direct')
                    // acknowledge
                  channel.ack(msg)
                })
            })
            .catch(err => {
              logger.error('Error caught while removing co-pilot from direct', err)
              channel.nack(msg, false, false)
            })
        } else {
          logger.info('project not associated with a direct project, skipping')
          channel.ack(msg)
        }
      })
      .catch(err => {
        // if the message has been redelivered dont attempt to reprocess it
        logger.error('Error retrieving project', err, msg)
        channel.nack(msg, false, !msg.fields.redelivered)
      })
  } else if (member.role === PROJECT_MEMBER_ROLE.MANAGER) {
    // when a manager is removed from direct project we have to remove manager from direct
    return models.Project.getDirectProjectId(member.projectId)
      .then(directProjectId => {
        if (directProjectId) {
          // retrieve system user token
          return util.getSystemUserToken(logger)
            .then(token => {
              const req = {
                id: origRequestId,
                log: logger,
                headers: {
                  authorization: `Bearer ${token}`
                }
              }
              return directProject.editProjectPermissions(req, directProjectId, {
                  permissions: [
                    {
                      userId: member.userId,
                      resourceId: directProjectId,
                      permissionType: {
                        permissionTypeId: '',
                        name: 'project_full'
                      },
                      studio: false
                    }
                  ]
                })
                .then(resp => {
                  logger.debug('removed manager from direct')
                    // acknowledge
                  channel.ack(msg)
                })
            })
            .catch(err => {
              logger.error('Error caught while adding manager from direct', err)
              channel.nack(msg, false, false)
            })
        } else {
          logger.info('project not associated with a direct project, skipping')
          channel.ack(msg)
        }
      })
      .catch(err => {
        // if the message has been redelivered dont attempt to reprocess it
        logger.error('Error retrieving project', err, msg)
        channel.nack(msg, false, !msg.fields.redelivered)
      })
  } else {
    // nothing to do
    channel.ack(msg)
  }
}

module.exports = {
  projectMemberAddedHandler,
  projectMemberRemovedHandler
}
