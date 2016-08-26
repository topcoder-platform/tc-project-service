'use strict'

import _ from 'lodash'
import { EVENT } from '../../constants'

module.exports = (app, logger) => {

  // Handle internal events
  const internalEvents = [
    EVENT.INTERNAL.PROJECT_MEMBER_ADDED,
    EVENT.INTERNAL.PROJECT_MEMBER_REMOVED
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
