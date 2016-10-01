'use strict'
import util from '../util'
import config from 'config'
import _ from 'lodash'
/**
 * Service methods to handle creating topics
 */

/**
 * Build custom http client for request
 * @param req request
 * @returns custom http client
 * @private
 */
function _getHttpClient(req){
    var httpClient = util.getHttpClient(req)
    httpClient.defaults.headers.common['Authorization'] = req.headers.authorization
    httpClient.defaults.baseURL = config.get('topicServiceEndpoint')
    httpClient.defaults.timeout = 3000
    httpClient.interceptors.response.use(resp => {
        // req.log.debug('resp: ', JSON.stringify(resp.data, null, 2))
        if (resp.status !== 200 || resp.data.result.status !== 200) {
            req.log.error('error resp: ', JSON.stringify(resp.data, null, 2))
            return Promise.reject(new Error(resp.data.result.content.message))
        }
        return Promise.resolve(resp)
    })
    return httpClient
}


export default {

  /**
   * Create topics in topic service
   */
  createTopic(req, projectId, title, message, tag='PRIMARY') {
    return _getHttpClient(req)
      .post('', {
        reference: 'project',
        referenceId: projectId.toString(),
        tag,
        title,
        body: message
      })

  }
}
