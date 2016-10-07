'use strict'

import _ from 'lodash'
import { EVENT, PROJECT_MEMBER_ROLE } from '../../constants'
import util from '../../util'
import models from '../../models'
import directProject from '../../services/directProject'


module.exports = (app, logger) => {
  // Handle internal events
  const internalEvents = [
    EVENT.INTERNAL.PROJECT_MEMBER_ADDED,
    EVENT.INTERNAL.PROJECT_MEMBER_REMOVED
  ]

  // Publish messages to the queue
  _.map(internalEvents, (evt) => {
    app.on(evt, ({payload, props}) => {
      logger.debug('handling ', evt)
      let key = evt.substring(evt.indexOf('.') + 1)
      return app.services.pubsub.publish(key, payload, props)
    })
  })


  // EXTERNAL events
  app.on(EVENT.EXTERNAL.PROJECT_MEMBER_ADDED, (msg, next) => {
    const origRequestId = msg.properties.correlationId
    logger = logger.child({requestId: origRequestId})
    let newMember = JSON.parse(msg.content.toString())
    logger.debug(`received msg '${EVENT.EXTERNAL.PROJECT_MEMBER_ADDED}'`, newMember)

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
                  headers: { authorization: `Bearer ${token}` }
                }
                return  directProject.addCopilot(req, directProjectId, {
                  copilotUserId: newMember.userId
                })
                  .then((resp) => {
                    next()
                  })
              })
              .catch(err => {
                logger.error('Error caught while adding co-pilot from direct', err)
                return next(err)
              })
          } else {
            next()
          }
        })
        .catch(err => next(err))
    } else {
      // nothing to do
      next()
    }
  })

  app.on(EVENT.EXTERNAL.PROJECT_MEMBER_REMOVED, (msg, next) => {
    const origRequestId = msg.properties.correlationId
    const member = JSON.parse(msg.content.toString())
    logger = logger.child({requestId: origRequestId})
    logger.debug(`received msg '${EVENT.EXTERNAL.PROJECT_MEMBER_REMOVED}'`, member)

    if (member.role === PROJECT_MEMBER_ROLE.COPILOT) {
      // Add co-pilot when a co-pilot is added to a project
      return models.Project.getDirectProjectId(member.projectId)
        .then(directProjectId => {
          if (directProjectId) {
            // retrieve system user token
            return util.getSystemUserToken(logger)
              .then(token => {
                const req = {
                  id: origRequestId,
                  log: logger,
                  headers: { authorization: `Bearer ${token}` }
                }
                return  directProject.deleteCopilot(req, directProjectId, {
                  copilotUserId: member.userId
                })
              })
              .catch(err => {
                logger.error('Error caught while removing co-pilot from direct', err)
                return next(err)
              })
          } else {
            // nothing to do
            next()
          }
        })
        .catch(err => next(err))
    } else {
      // nothing to do
      next()
    }
  })
}
