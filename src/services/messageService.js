import config from 'config';
import _ from 'lodash';

const Promise = require('bluebird');
const axios = require('axios');
const tcCoreLibAuth = require('tc-core-library-js').auth;

const m2m = tcCoreLibAuth.m2m(config);


/**
 * Get Http client to bus api
 * @param {Object} logger object
 * @return {Object} Http Client to bus api
 */
async function getClient(logger) {
  let client = null;
  const msgApiUrl = config.get('messageApiUrl');
  try {
    const token = await m2m.getMachineToken(config.AUTH0_CLIENT_ID, config.AUTH0_CLIENT_SECRET);
    client = axios.create({ baseURL: msgApiUrl });

    // Alter defaults after instance has been created
    client.defaults.headers.common.Authorization = `Bearer ${token}`;

    // Add a response interceptor
    client.interceptors.response.use(function (res) { // eslint-disable-line
      return res;
    }, function (error) { // eslint-disable-line
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
      // Ingore response errors
      return Promise.reject(error);
    });

    return client;
  } catch (err) {
    return Promise.reject(`Message api calling - Error in genearting m2m token : ${err.message}`);
  }
}

/**
 * Creates a new topic in message api
 *
 * @param {Object} topic the topic, should be a JSON object
 * @param {Object} logger object
 * @return {Promise} new topic promise
 */
function createTopic(topic, logger) {
  logger.debug(`createTopic for topic: ${JSON.stringify(topic)}`);
  return getClient(logger).then((msgClient) => {
    logger.debug('calling message service');
    return msgClient.post('/topics/create', topic)
      .then((resp) => {
        logger.debug('Topic created successfully');
        logger.debug(`Topic created successfully [status]: ${resp.status}`);
        logger.debug(`Topic created successfully [data]: ${resp.data}`);
        return _.get(resp.data, 'result.content', {});
      })
      .catch((error) => {
        logger.debug('Error creating topic');
        logger.error(error);
         // eslint-disable-line
      });
  }).catch((errMessage) => {
    logger.debug(errMessage);
  });
}

/**
 * Updates the given topic in message api
 *
 * @param {Number} topicId id of the topic to be updated
 * @param {Object} topic the topic, should be a JSON object
 * @param {Object} logger object
 * @return {Promise} new topic promise
 */
function updateTopic(topicId, topic, logger) {
  logger.debug(`updateTopic for topic: ${JSON.stringify(topic)}`);
  return getClient(logger).then((msgClient) => {
    logger.debug('calling message service');
    return msgClient.post(`/topics/${topicId}/edit`, topic)
      .then((resp) => {
        logger.debug('Topic updated successfully');
        logger.debug(`Topic updated successfully [status]: ${resp.status}`);
        logger.debug(`Topic updated successfully [data]: ${resp.data}`);
        return _.get(resp.data, 'result.content', {});
      })
      .catch((error) => {
        logger.debug('Error updating topic');
        logger.error(error);
         // eslint-disable-line
      });
  }).catch((errMessage) => {
    logger.debug(errMessage);
  });
}

/**
 * Deletes the given posts for the given topic.
 *
 * @param {Integer} topicId id of the topic
 * @param {Array} postIds array of post ids to be deleted, array of integers
 * @param {Object} logger object
 * @return {Promise} delete posts promise
 */
function deletePosts(topicId, postIds, logger) {
  logger.debug(`deletePosts for topicId: ${topicId} and postIds: ${postIds}`);
  const promises = [];
  if (postIds && postIds.length > 0) {
    postIds.forEach((postId) => {
      promises.push(getClient(logger).then((msgClient) => {
        logger.debug(`calling message service for deleting post#${postId}`);
        return msgClient.delete(`/topics/${topicId}/posts/${postId}/remove`);
      }));
    });
  }
  if (promises.length > 0) {
    return Promise.all(promises).then(() => logger.debug(`All posts deleted for topic ${topicId}`));
  }
  return Promise.resolve();
}

/**
 * Fetches the topic of given phase of the project.
 *
 * @param {Integer} projectId id of the project
 * @param {String} tag tag
 * @param {Object} logger object
 * @return {Promise} topic promise
 */
function getTopicByTag(projectId, tag, logger) {
  logger.debug(`getTopicByTag for projectId: ${projectId} tag: ${tag}`);
  return getClient(logger).then((msgClient) => {
    logger.debug(`calling message service for fetching ${tag}`);
    const encodedFilter = encodeURIComponent(`reference=project&referenceId=${projectId}&tag=${tag}`);
    return msgClient.get(`/topics/list/db?filter=${encodedFilter}`)
      .then((resp) => {
        const topics = _.get(resp.data, 'result.content', []);
        logger.debug(`Fetched ${topics.length} topics`);
        if (topics && topics.length > 0) {
          return topics[0];
        }
        return null;
      });
  });
}

/**
 * Deletes the given topic.
 *
 * @param {Integer} topicId id of the topic
 * @param {Object} logger object
 * @return {Promise} delete topic promise
 */
function deleteTopic(topicId, logger) {
  logger.debug(`deleteTopic for topicId: ${topicId}`);
  return getClient(logger).then((msgClient) => {
    logger.debug(`calling message service for deleting topic#${topicId}`);
    return msgClient.delete(`/topics/${topicId}/remove`);
  });
}

module.exports = {
  createTopic,
  updateTopic,
  deletePosts,
  getTopicByTag,
  deleteTopic,
  getClient,
};
