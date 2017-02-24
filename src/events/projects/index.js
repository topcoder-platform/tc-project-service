import _ from 'lodash'
import {
  EVENT
} from '../../constants'
import util from '../../util'
import config from 'config'
import querystring from 'querystring'
import models from '../../models'

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
  // disabling salesforce integration for now,
  // see https://github.com/topcoder-platform/tc-project-service/issues/38
  return channel.ack(msg)
  // let project = JSON.parse(msg.content)
  // return util.getSystemUserToken(logger)
  //   .then(token => {
  //     const req = {
  //       id: 1,
  //       log: logger,
  //       headers: {
  //         authorization: `Bearer ${token}`
  //       }
  //     }
  //     return Promise.all([
  //       _addSalesforceLead(token, logger, project).then((resp)=> logger.debug('web to lead response:', resp.status))
  //     ]);
  //   })
  //   .then(() => {
  //     channel.ack(msg)
  //   })
  //   .catch(err => {
  //     // don't requeue for now
  //     logger.error('Error processing', msg, err)
  //     channel.nack(msg, false, false)
  //   })
}

/**
 * Handler for project updation event
 * @param  {[type]} logger  logger to log along with trace id
 * @param  {[type]} msg     event payload
 * @param  {[type]} channel channel to ack, nack
 */
const projectUpdatedHandler = (logger, msg, channel) => {
  const payload = JSON.parse(msg.content.toString())
  // we only update the project history table if project status is actually updated
  if (payload.original.status !== payload.updated.status) {
    models.ProjectHistory.create({
      projectId: payload.updated.id,
      // keep the updated status here
      status: payload.updated.status,
      cancelReason: payload.updated.cancelReason,
      // the user who updated the project is also responsible for updating project history
      updatedBy: payload.updated.updatedBy
    }).then(() => {
      logger.info('project history updated')
      // ack message as success
      channel.ack(msg)
    }).catch((error) => {
      // if failed to process message than try again
      logger.error('Error caught while updating project history', error)
      channel.nack(msg, false, false)
    });
  } else {
    // nothing to do, ack message
    channel.ack(msg)
  }
}

module.exports = {
  projectCreatedHandler,
  projectUpdatedHandler
}
