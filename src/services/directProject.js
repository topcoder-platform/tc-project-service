'use strict'
import util from '../util'
import config from 'config'
/**
 * Service methods to handle direct project.
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
    httpClient.defaults.headers.common['Content-Type'] = 'application/json'
    httpClient.defaults.baseURL = config.get('directProjectServiceEndpoint')
    httpClient.defaults.timeout = 4000
    httpClient.interceptors.response.use((resp) => {
        req.log.debug('resp: ', JSON.stringify(resp.data, null, 2))
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
     * Create direct project
     * @param req the request
     * @param body the body contains project information
     */
    createDirectProject: (req, body) =>_getHttpClient(req)
        .post('/projects/', body),
    /**
     * Add direct project copilot
     * @param req the request
     * @param directProjectId the id of direct project
     * @param body the body contains project copilot information
     */
    addCopilot: (req, directProjectId, body) =>_getHttpClient(req)
        .post(`/projects/${directProjectId}/copilot`, body),
    /**
     * Remove direct project copilot
     * @param req the request
     * @param directProjectId the id of direct project
     * @param body the body contains project copilot information
     */
    deleteCopilot: (req, directProjectId, body) =>_getHttpClient(req)
        .delete(`/projects/${directProjectId}/copilot`, body),
    /**
     * Add billing account for direct project
     * @param req the request
     * @param directProjectId the id of direct project
     * @param body the body contains billing account information
     */
    addBillingAccount: (req, directProjectId, body) =>_getHttpClient(req)
        .post(`/projects/${directProjectId}/billingaccount`, body),
}
