'use strict'

import _ from 'lodash'

module.exports = (app, logger) => {

  // Handle internal events
  const internalEvents = [
    'internal.project.draft-created',
    'internal.project.launched',
    'internal.project.updated',
    'internal.project.cancelled',
    'internal.project.completed'
  ]

  // Publish messages to the queue
  _.map(internalEvents, (evt) => {
    app.on(evt, (project) => {
      logger.debug('handling ' + evt)
      let key = evt.substring(evt.indexOf('.') + 1)
      return app.services.pubsub.publish(key, project)
    })
  })

  app.on('external.project.draft-created', (msg, next) => {
    let project = JSON.parse(msg.content.toString())
    logger.debug('received msg \'project.draft-created\'', project)

    // callback to acknowledge the message (return Error to reject message)
    next()
  })

}
