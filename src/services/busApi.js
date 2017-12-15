import config from 'config';

const Promise = require('bluebird');
const axios = require('axios');


let client = null;

/**
 * Get Http client to bus api
 * @return {Object} Http Client to bus api
 */
function getClient() {
  if (client) return client;
  const apiBusUrl = config.get('busApiUrl');
  const apiBusToken = config.get('busApiToken');

  client = axios.create({ baseURL: apiBusUrl });

  // Alter defaults after instance has been created
  client.defaults.headers.common.Authorization = `Bearer ${apiBusToken}`;

  // Add a response interceptor
  client.interceptors.response.use(function (res) { // eslint-disable-line
    return res;
  }, function (error) { // eslint-disable-line
    // Ingore response errors
    return Promise.resolve();
  });

  return client;
}

/**
 * Creates a new event in Bus API
 * Any errors will be simply ignored
 * @param {String} type the event type, should be a dot separated fully qualitied name
 * @param {Object} message the message, should be a JSON object
 * @return {Promise} new event promise
 */
function createEvent(type, message) {
  const body = JSON.stringify(message);
  return getClient().post('/eventbus/events', {
    type,
    message: body,
  })
  .then(resp => resp)
  .catch(error => Promise.resolve());    // eslint-disable-line
}


module.exports = {
  createEvent,
};
