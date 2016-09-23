'use strict'

import _ from 'lodash'
import util from '../../util'
import { EVENT } from '../../constants'
import directService from '../../services/directProject'
module.exports = (app, logger) => {

  // Handle internal events
  const internalEvents = [
    EVENT.INTERNAL.PROJECT_DRAFT_CREATED,
    EVENT.INTERNAL.PROJECT_LAUNCHED,
    EVENT.INTERNAL.PROJECT_UPDATED,
    EVENT.INTERNAL.PROJECT_CANCELLED,
    EVENT.INTERNAL.PROJECT_COMPLETED
  ]

  // Publish messages to the queue
  _.map(internalEvents, (evt) => {
    app.on(evt, (project) => {
      logger.debug('handling ' + evt)
      let key = evt.substring(evt.indexOf('.') + 1)
      return app.services.pubsub.publish(key, project)
    })
  })

  app.on(EVENT.EXTERNAL.PROJECT_DRAFT_CREATED, (msg, next) => {
    let project = JSON.parse(msg.content.toString())
    logger.debug('received msg \'project.draft-created\'', project.id)

    // TODO insert into elasticsearch
    next()

    // // create project in direct
    // if (!project.directProectId) {
    //   logger.debug('creating direct project')
    //   createDirectProject(project, logger)
    //     .then(resp => {
    //       return models.Project.update(
    //         { directProjectId: resp.data.result.content.projectId },
    //         { where: { id: project.id } }
    //       )
    //       .then(() => next() )
    //       .catch(err => next(err))
    //     })
    // } else {
    //   console.log(project.directProjectId)
    //   next()
    // }
  })


  const createDirectProject = (project, logger) => {
    console.log('retrieving system user token')
    return util.getSystemUserToken(logger)
      .then(token => {
        const req = {
          id: 1,
          log: logger,
          headers: { authorization: `Bearer ${token}` }
        }
        // create direct project with name and description
        var body = {
          projectName: project.name,
          projectDescription: project.description
        }
        // billingAccountId is optional field
        if(project.billingAccountId){
          body.billingAccountId = project.billingAccountId
        }
        return directService.createDirectProject(req, body)
      })
      .catch((err) => {
        console.log(err)
        return Promise.reject(err)
      })
  }
}
