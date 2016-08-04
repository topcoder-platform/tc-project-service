'use strict'

import _ from 'lodash'

module.exports = (app, logger) => {

  // Handle internal events
  const internalEvents = [
    'internal.project.member.added',
    'internal.project.member.removed'
  ]

  // Publish messages to the queue
  _.map(internalEvents, (evt) => {
    app.on(evt, (member) => {
      logger.debug('handling ' + evt)
      let key = evt.substring(evt.indexOf('.') + 1)
      return app.services.pubsub.publish(key, member)
    })
  })

}
