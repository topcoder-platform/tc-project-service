/**
 * Event handlers for project members create, update and delete
 */
import _ from 'lodash';
import Promise from 'bluebird';
import config from 'config';
import util from '../../util';

const ES_PROJECT_INDEX = config.get('elasticsearchConfig.indexName');
const ES_PROJECT_TYPE = config.get('elasticsearchConfig.docType');
const eClient = util.getElasticSearchClient();

const updateESPromise = Promise.coroutine(function* a(logger, requestId, projectId, updateDocHandler) {
  try {
    const doc = yield eClient.get({ index: ES_PROJECT_INDEX, type: ES_PROJECT_TYPE, id: projectId });
    const updatedDoc = yield updateDocHandler(doc);
    return eClient.update({
      index: ES_PROJECT_INDEX,
      type: ES_PROJECT_TYPE,
      id: projectId,
      body: { doc: updatedDoc },
    })
    .then(() => logger.debug('elasticsearch project document updated successfully'));
  } catch (error) {
    logger.error('Error caught updating ES document', error);
    return Promise.reject(error);
  }
});

/**
 * Project member added event handler
 * @param  {Object} logger  logger
 * @param  {Object} msg     event payload
 * @param  {Object} channel channel to ack / nack
 * @return {undefined}
 */
const projectMemberAddedHandler = Promise.coroutine(function* a(logger, msg, channel) {
  try {
    const origRequestId = msg.properties.correlationId;
    const newMember = JSON.parse(msg.content.toString());
    const projectId = newMember.projectId;
    // handle ES Update
    // fetch the member information
    const updateDocPromise = Promise.coroutine(function* (doc) { // eslint-disable-line func-names
      const memberDetails = yield util.getMemberDetailsByUserIds([newMember.userId], logger, origRequestId);
      const payload = _.merge(newMember, _.pick(memberDetails[0], 'handle', 'firstName', 'lastName', 'email'));
      // now merge the updated changes and reindex the document for members
      const members = _.isArray(doc._source.members) ? doc._source.members : []; // eslint-disable-line no-underscore-dangle
      members.push(payload);
      // now merge the updated changes and reindex the document for invites
      const invites = _.isArray(doc._source.invites) ? doc._source.invites : []; // eslint-disable-line no-underscore-dangle
      // removing any invites for the member just added to the team
      _.remove(invites, invite => invite.email === payload.email || invite.userId === payload.userId);
      return _.merge(doc._source, { members, invites }); // eslint-disable-line no-underscore-dangle
    });
    yield Promise.all([updateESPromise(logger, origRequestId, projectId, updateDocPromise)]);
    logger.debug('elasticsearch index updated successfully and co-pilot/manager updated in direct project');
    channel.ack(msg);
  } catch (error) {
    logger.error('Error handling projectMemberAdded Event', error);
    // if the message has been redelivered dont attempt to reprocess it
    channel.nack(msg, false, !msg.fields.redelivered);
  }
});

/**
 * Project member removed event handler
 * @param  {Object} logger  logger
 * @param  {Object} msg     event payload
 * @param  {Object} channel channel to ack / nack
 * @return {undefined}
 */
const projectMemberRemovedHandler = Promise.coroutine(function* (logger, msg, channel) { // eslint-disable-line func-names
  try {
    const origRequestId = msg.properties.correlationId;
    const member = JSON.parse(msg.content.toString());
    const projectId = member.projectId;
    const updateDocPromise = (doc) => {
      const members = _.filter(doc._source.members, single => single.id !== member.id);   // eslint-disable-line no-underscore-dangle
      return Promise.resolve(_.set(doc._source, 'members', members));    // eslint-disable-line no-underscore-dangle
    };
    yield Promise.all([
      updateESPromise(logger, origRequestId, projectId, updateDocPromise),
    ]);
    logger.info('elasticsearch index updated successfully and co-pilot/manager removed in direct project');
    channel.ack(msg);
  } catch (error) {
    logger.error('failed to consume message, unexpected error', error);
    // if the message has been redelivered dont attempt to reprocess it
    channel.nack(msg, false, !msg.fields.redelivered);
  }
});

/**
 * Project member updated event handler
 * @param  {Object} logger  logger
 * @param  {Object} msg     event payload
 * @param  {Object} channel channel to ack / nack
 * @return {undefined}
 */
const projectMemberUpdatedHandler = Promise.coroutine(function* a(logger, msg, channel) {
  try {
    const data = JSON.parse(msg.content.toString());
    // get member information
    const memberDetails = yield util.getMemberDetailsByUserIds([data.original.userId], logger);
    const payload = _.merge(data.updated, _.pick(memberDetails[0], 'handle', 'firstName', 'lastName', 'email'));
    const doc = yield eClient.get({ index: ES_PROJECT_INDEX, type: ES_PROJECT_TYPE, id: data.original.projectId });

    // merge the changes and update the elasticsearch index
    const members = _.map(doc._source.members, (single) => {   // eslint-disable-line no-underscore-dangle
      if (single.id === data.original.id) {
        return _.merge(single, payload);
      }
      return single;
    });
    const merged = _.merge(doc._source, { members });     // eslint-disable-line no-underscore-dangle
    // update the merged document
    yield eClient.update({
      index: ES_PROJECT_INDEX,
      type: ES_PROJECT_TYPE,
      id: data.original.projectId,
      body: { doc: merged },
    });
    logger.debug('elasticsearch project document updated, member updated successfully');
    channel.ack(msg);
  } catch (err) {
    logger.error('Unhandled error', err);
    channel.nack(msg, false, !msg.fields.redelivered);
  }
});

module.exports = {
  projectMemberAddedHandler,
  projectMemberRemovedHandler,
  projectMemberUpdatedHandler,
  updateESPromise,
};
