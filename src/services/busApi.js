import config from 'config';

const Promise = require('bluebird');
const axios = require('axios');
const tcCoreLibAuth = require('tc-core-library-js').auth;

const m2m = tcCoreLibAuth.m2m(config);

let client = null;

/**
 * Get Http client to bus api
 * @return {Object} Http Client to bus api
 */
async function getClient() {
  if (client) return client;
  const apiBusUrl = config.get('busApiUrl');
  try {
    const token = await m2m.getMachineToken(config.AUTH0_CLIENT_ID, config.AUTH0_CLIENT_SECRET);
    client = axios.create({ baseURL: apiBusUrl });

    // Alter defaults after instance has been created
    client.defaults.headers.common.Authorization = `Bearer ${token}`;

    // Add a response interceptor
    client.interceptors.response.use(function (res) { // eslint-disable-line
      return res;
    }, function (error) { // eslint-disable-line
      // Ingore response errors
      return Promise.resolve();
    });

    return client;
  } catch (err) {
    return Promise.reject(`Bus api calling - Error in genearting m2m token : ${err.message}`);
  }
}

/**
 * Creates a new event in Bus API
 * Any errors will be simply ignored
 * @param {String} type the event type, should be a dot separated fully qualitied name
 * @param {Object} message the message, should be a JSON object
 * @param {Object} logger object
 * @return {Promise} new event promise
 */
function createEvent(type, message, logger) {
  const body = JSON.stringify(message);
  logger.debug(`Sending message: ${JSON.stringify(message)}`);
  return getClient().then((busClient) => {
    logger.debug('calling bus-api');
    busClient.post('/bus/events', {
      type,
      message: body,
    })
      .then((resp) => {
        logger.debug('Sent event to bus-api');
        logger.debug(`Sent event to bus-api [data]: ${resp.data}`);
        logger.debug(`Sent event to bus-api [status]: ${resp.status}`);
      })
      .catch((error) => {
        logger.debug('Error sending event to bus-api');
        if (error.response) {
          // The request was made and the server responded with a status code
          // that falls out of the range of 2xx
          logger.debug(error.response.data);
          logger.debug(error.response.status);
          logger.debug(error.response.headers);
        } else if (error.request) {
          // The request was made but no response was received
          // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
          // http.ClientRequest in node.js
          logger.debug(error.request);
        } else {
          // Something happened in setting up the request that triggered an Error
          logger.debug(error.message);
        }
        logger.debug(error.config);
        Promise.resolve();     // eslint-disable-line
      });
  }).catch((errMessage) => {
    logger.debug(errMessage);
  });
}

module.exports = {
  createEvent,
};
