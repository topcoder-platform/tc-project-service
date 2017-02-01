import _ from 'lodash'
import {
  EVENT
} from '../../constants'
import util from '../../util'
import config from 'config'
import querystring from 'querystring'

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
