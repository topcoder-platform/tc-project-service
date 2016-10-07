'use strict'
import _ from 'lodash'
import { EVENT } from '../../constants'
import createEventHandler from './create.event'

module.exports = (app, logger) => {

  // Handle internal events
  const internalEvents = [
    EVENT.INTERNAL.PROJECT_DRAFT_CREATED,
    EVENT.INTERNAL.PROJECT_LAUNCHED,
    EVENT.INTERNAL.PROJECT_UPDATED,
    EVENT.INTERNAL.PROJECT_CANCELLED,
    EVENT.INTERNAL.PROJECT_COMPLETED,
    EVENT.INTERNAL.PROJECT_DELETED
  ]

  // Publish messages to the queue
  _.map(internalEvents, (evt) => {
    app.on(evt, ({payload, props}) => {
      logger.debug('handling ' + evt)
      let key = evt.substring(evt.indexOf('.') + 1)
      return app.services.pubsub.publish(key, payload, props)
    })
  })

  app.on(EVENT.EXTERNAL.PROJECT_DRAFT_CREATED, (msg, next) => {
    // log with correlationId (request Id)
    logger = logger.child({requestId: msg.properties.correlationId})
    let project = JSON.parse(msg.content.toString())
    logger.debug('received msg \'project.draft-created\'', project.id)

    // TODO insert into elasticsearch
    createEventHandler(logger, project)
      .then(() => next() )
      .catch(err => {console.log('error handling event', err); next(err) })
  })
}
