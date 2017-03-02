
import util from '../util';
import config from 'config';
/**
 * Service methods to handle direct project.
 */

/**
 * Build custom http client for request
 * @param req request
 * @returns custom http client
 * @private
 */
function _getHttpClient(req) {
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
   */
  deleteFile(req, filePath) {
    _getHttpClient(req).delete('', { params: { filter: `filePath%3D${filePath}` } });
  },
};
