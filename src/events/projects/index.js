import config from 'config';
import querystring from 'querystring';
import util from '../../util';

/**
 * Creates a lead in salesforce for the connect project.
 *
 * @param {String} token JWT token of the admin user which would be used to fetch user info
 * @param {String} logger logger to be used for logging
 * @param {Object} project connect project for which lead is to be created
 * @returns {Promise} promise which resolves to the HTML content where
 * salesforce web to lead form redirects
 */
// const addSalesforceLead = (token, logger, project) => {
//   logger.debug('Getting topcoder user with userId: ', project.createdBy);
//   return util.getTopcoderUser(project.createdBy, token, logger)
//   .then((userInfo) => {
//     const httpClient = util.getHttpClient({ id: 2, log: logger });
//     httpClient.defaults.timeout = 3000;
//     httpClient.defaults.headers.common['Content-Type'] = 'application/x-www-form-urlencoded';
//     const data = {
//       oid: config.get('salesforceLead.orgId'),
//       first_name: userInfo.firstName,
//       last_name: userInfo.lastName,
//       email: userInfo.email,
//     };
//     data[config.get('salesforceLead.projectIdFieldId')] = project.id;
//     data[config.get('salesforceLead.projectNameFieldId')] = project.name;
//     data[config.get('salesforceLead.projectDescFieldId')] = project.description;
//     data[config.get('salesforceLead.projectLinkFieldId')] =
//        config.get('connectProjectsUrl') + project.id;
//     const body = querystring.stringify(data);
//     const webToLeadUrl = config.get('salesforceLead.webToLeadUrl');
//     logger.debug('initiaiting salesforce web to lead call for project: ', project.id);
//     return httpClient.post(webToLeadUrl, body);
//   });
// };


/**
 * Handler for project creation event
 * @param  {Object} logger  logger to log along with trace id
 * @param  {Object} msg     event payload
 * @param  {Object} channel channel to ack, nack
 * @returns {undefined}
 */
const projectCreatedHandler = (logger, msg, channel) =>
  // disabling salesforce integration for now,
  // see https://github.com/topcoder-platform/tc-project-service/issues/38
   channel.ack(msg);
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
  //       addSalesforceLead(token, logger, project)
  //       .then((resp)=> logger.debug('web to lead response:', resp.status))
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


module.exports = {
  projectCreatedHandler,
};
