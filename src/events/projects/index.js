import _ from 'lodash'
import {
  EVENT
} from '../../constants'
import util from '../../util'
import topicService from '../../services/topicService'

//
// // Handle internal events
// const internalEvents = [
//   EVENT.INTERNAL.PROJECT_DRAFT_CREATED,
//   EVENT.INTERNAL.PROJECT_LAUNCHED,
//   EVENT.INTERNAL.PROJECT_UPDATED,
//   EVENT.INTERNAL.PROJECT_CANCELLED,
//   EVENT.INTERNAL.PROJECT_COMPLETED,
//   EVENT.INTERNAL.PROJECT_DELETED
// ]
//
// // Publish messages to the queue
// _.map(internalEvents, (evt) => {
//   app.on(evt, ({payload, props}) => {
//     logger.debug('handling ' + evt)
//     let key = evt.substring(evt.indexOf('.') + 1)
//     return app.services.pubsub.publish(key, payload, props)
//   })
// })
const _addProjectStatus = (req, logger, project) => {
  const topics = [
    {
      title: 'Hello, Coder here! Your project has been created successfully',
      body: 'It took almost 245ms for me to create it, but all is good now.\
        That\'s a lot of hard work for a robot, you know!'
    }, {
      title: 'Hey there, I\'m ready with the next steps for your project!',
      body: `<p>I went over the project and I see we still need to collect more\
       details before I can use my super computational powers and create your quote.</p>\
       <p>Head over to the <a href="/projects/${project.id}/specification/">Specification</a>\
        section and answer all of the required questions. If you already have a document\
        with specification, verify it against our checklist and upload it.</p>`
    }
  ]
  // NOTE: running these in sequence cos we want topic[0] to be created first
  // firing these events in parallel doesn't ensure that topic[0] is created first
  return topicService.createTopic(req, project.id, topics[0].title, topics[0].body)
    .then(() => topicService.createTopic(req, project.id, topics[1].title, topics[1].body))
    .then(() => {
      logger.debug('post-project creation messages posted')
      return true
    })
}
/**
 * Handler for project creation event
 * @param  {[type]} logger  logger to log along with trace id
 * @param  {[type]} msg     event payload
 * @param  {[type]} channel channel to ack, nack
 */
const projectCreatedHandler = (logger, msg, channel) => {
  let project = JSON.parse(msg.content.toString())
  return util.getSystemUserToken(logger)
    .then(token => {
      const req = {
        id: 1,
        log: logger,
        headers: {
          authorization: `Bearer ${token}`
        }
      }
      return _addProjectStatus(req, logger, project)
    })
    .then(() => {
      channel.ack(msg)
    })
    .catch(err => {
      // don't requeue for now
      logger.error('Error processing', msg, err)
      channel.nack(msg, false, false)
    })
}

module.exports = {
  projectCreatedHandler
}
