import config from 'config';
import util from '../util';
/**
 * Service methods to handle creating topics
 */

/**
 * Build custom http client for request
 * @param {Object} req request
 * @returns {Promise} custom http client
 * @private
 */
function getHttpClient(req) {
  const httpClient = util.getHttpClient(req);
  httpClient.defaults.headers.common.Authorization = req.headers.authorization;
  httpClient.defaults.baseURL = config.get('topicServiceEndpoint');
  httpClient.defaults.timeout = 30000;
  httpClient.interceptors.response.use((resp) => {
    // req.log.debug('resp: ', JSON.stringify(resp.data, null, 2))
    if (resp.status !== 200 || resp.data.result.status !== 200) {
      // req.log.error('error resp: ', JSON.stringify(resp.data, null, 2))
      return Promise.reject(new Error(resp.data.result.content.message));
    }
    return Promise.resolve(resp);
  });
  return httpClient;
}


/**
 * Create topics in topic service
 * @param {Object} req request object
 * @param {integer} projectId project id
 * @param {String} title title of the post
 * @param {String} message message to be posted
 * @param {String} tag tag, defaults to PRIMARY
 * @return {Promise} returned Promise
 */
function createTopic(req, projectId, title, message, tag = 'PRIMARY') {
  return getHttpClient(req)
    .post('', {
      reference: 'project',
      referenceId: projectId.toString(),
      tag,
      title,
      body: message,
    });
}


export default {
  createTopic,
};
