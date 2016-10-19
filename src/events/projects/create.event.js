import _ from 'lodash'
import util from '../../util'
import topicService from '../../services/topicService'

/*
 NOTE: Use this code segment if you wish to create direct projects async
import directService from '../../services/directProject'
const createDirectProject = (project, logger) => {
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

}
*/
const addProjectStatus = (req, logger, project) => {
  const topics = [
    {
      title: 'Hello, Coder here! Your project has been created successfully',
      body: 'It took almost 245ms for me to create it, but all is good now.\
        That\'s a lot of hard work for a robot, you know!'
    },
    {
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


const createEventHandler = (logger, project) => {
  return util.getSystemUserToken(logger)
    .then(token => {
      const req = {
        id: 1,
        log: logger,
        headers: { authorization: `Bearer ${token}` }
      }
      return addProjectStatus(req, logger, project)
    })
}

export default createEventHandler
