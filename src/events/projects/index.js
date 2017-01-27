import _ from 'lodash'
import {
  EVENT
} from '../../constants'
import util from '../../util'
import config from 'config'
import querystring from 'querystring'
import topicService from '../../services/topicService'

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
 * Creates a lead in salesforce for the connect project.
 *
 * @param token JWT token of the admin user which would be used to fetch user info
 * @param logger logger to be used for logging
 * @param project connect project for which lead is to be created
 *
 * @return promise which resolves to the HTML content where salesforce web to lead form redirects
 */
const _addSalesforceLead = (token, logger, project) => {
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


/**
 * Handler for project creation event
 * @param  {[type]} logger  logger to log along with trace id
 * @param  {[type]} msg     event payload
 * @param  {[type]} channel channel to ack, nack
 */
const projectCreatedHandler = (logger, msg, channel) => {
  let project = JSON.parse(msg.content)
  return util.getSystemUserToken(logger)
    .then(token => {
      const req = {
        id: 1,
        log: logger,
        headers: {
          authorization: `Bearer ${token}`
        }
      }
      return Promise.all([
        _addProjectStatus(req, logger, project),
        _addSalesforceLead(token, logger, project).then((resp)=> logger.debug('web to lead response:', resp.status))
      ]);
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
