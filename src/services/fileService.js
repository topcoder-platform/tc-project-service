/**
 * Service methods to handle direct project.
 */

import config from 'config';
import util from '../util';

/**
 * Build custom http client for request
 * @param   {Object}    req       request
 * @return  {Object}              custom http client
 * @private
 */
function getHttpClient(req) {
  const httpClient = util.getHttpClient(req);
  httpClient.defaults.headers.common.Authorization = req.headers.authorization;
  httpClient.defaults.baseURL = config.get('fileServiceEndpoint');
  httpClient.defaults.timeout = 3000;
  httpClient.interceptors.response.use((resp) => {
    req.log.debug('resp: ', JSON.stringify(resp.data, null, 2));
    if (resp.status !== 200 || resp.data.result.status !== 200) {
      req.log.error('error resp: ', JSON.stringify(resp.data, null, 2));
      return Promise.reject(new Error(resp.data.result.content.message));
    }
    return Promise.resolve(resp);
  });
  return httpClient;
}


export default {
  /**
   * Delete file from S3 using fileservice
   *
   * @param   {Object}      req         the request
   * @param   {String}      filePath    the file path
   * @return  {Void}                    the function returns void
   */
  deleteFile(req, filePath) {
    getHttpClient(req).delete('', { params: { filter: `filePath%3D${filePath}` } });
  },
};
