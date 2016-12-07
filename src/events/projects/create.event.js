import _ from 'lodash'
import util from '../../util'
import config from 'config'
import topicService from '../../services/topicService'
import querystring from 'querystring'

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

/**
 * Creates a lead in salesforce for the connect project.
 *
 * @param token JWT token of the admin user which would be used to fetch user info
 * @param logger logger to be used for logging
 * @param project connect project for which lead is to be created
 *
 * @return promise which resolves to the HTML content where salesforce web to lead form redirects
 */
const addSalesforceLead = (token, logger, project) => {
  logger.debug('Getting topcoder user with userId: ', project.createdBy)
  return util.getTopcoderUser(project.createdBy, token, logger)
  .then((userInfo) => {
    var httpClient = util.getHttpClient({id: 2,log : logger})
    httpClient.defaults.timeout = 3000
    httpClient.defaults.headers.common['Content-Type'] = 'application/x-www-form-urlencoded'
    var data = {
      oid: config.get('salesforceLead.orgId'),
      first_name: userInfo.firstName,
      last_name: userInfo.lastName,
      email: userInfo.email
    }
    data[config.get('salesforceLead.projectIdFieldId')] = project.id
    data[config.get('salesforceLead.projectNameFieldId')] = project.name
    data[config.get('salesforceLead.projectDescFieldId')] = project.description
    data[config.get('salesforceLead.projectLinkFieldId')] = config.get('connectProjectsUrl') + project.id
    var body =  querystring.stringify(data)
    var webToLeadUrl = config.get('salesforceLead.webToLeadUrl')
    logger.debug('initiaiting salesforce web to lead call for project: ', project.id)
    return httpClient.post(webToLeadUrl, body)
  })
}


const createEventHandler = (logger, project) => {
  logger.debug('Getting system user token....')
  return util.getSystemUserToken(logger)
    .then(token => {
      logger.debug('received system user token....', token)
      const req = {
        id: 1,
        log: logger,
        headers: { authorization: `Bearer ${token}` }
      }
      return Promise.all([
        addProjectStatus(req, logger, project),
        addSalesforceLead(token, logger, project).then((resp)=> logger.debug('lead response:', resp))
      ]);
    })
}

export default createEventHandler
