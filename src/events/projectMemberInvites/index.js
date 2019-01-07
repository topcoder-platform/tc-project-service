/**
 * Event handlers for project member invite create and update
 */
import _ from 'lodash';
import Promise from 'bluebird';
import { updateESPromise } from '../projectMembers';

/**
 * Project member invite careted event handler
 * @param  {Object} logger  logger
 * @param  {Object} msg     event payload
 * @param  {Object} channel channel to ack / nack
 * @return {undefined}
 */
const projectMemberInviteCreatedHandler = Promise.coroutine(function* a(logger, msg, channel) {
  try {
    const origRequestId = msg.properties.correlationId;
    const newInvite = JSON.parse(msg.content.toString());
    const projectId = newInvite.projectId;

    // handle ES Update
    // add new invite to document invites array
    const updateDocPromise = Promise.coroutine(function* (doc) { // eslint-disable-line
      // now merge the updated changes and reindex the document
      const invites = _.isArray(doc._source.invites) ? doc._source.invites : []; // eslint-disable-line no-underscore-dangle
      invites.push(newInvite);
      return _.merge(doc._source, { invites }); // eslint-disable-line no-underscore-dangle
    });

    yield updateESPromise(logger, origRequestId, projectId, updateDocPromise);
    logger.debug('elasticsearch index updated successfully');
    channel.ack(msg);
  } catch (error) {
    logger.error('Error handling projectMemberInviteCreated Event', error);
    // if the message has been redelivered dont attempt to reprocess it
    channel.nack(msg, false, !msg.fields.redelivered);
  }
});

/**
 * Project member invite updated event handler
 * @param  {Object} logger  logger
 * @param  {Object} msg     event payload
 * @param  {Object} channel channel to ack / nack
 * @return {undefined}
 */
const projectMemberInviteUpdatedHandler = Promise.coroutine(function* a(logger, msg, channel) {
  try {
    const origRequestId = msg.properties.correlationId;
    const updatedInvite = JSON.parse(msg.content.toString());
    const projectId = updatedInvite.projectId;

    // handle ES Update
    // remove invite in document invites array, based on either userId or email
    const updateDocPromise = Promise.coroutine(function* (doc) { // eslint-disable-line
      // now merge the updated changes and reindex the document
      const invites = _.isArray(doc._source.invites) ? doc._source.invites : []; // eslint-disable-line no-underscore-dangle
      _.remove(invites, invite => (!!updatedInvite.email && invite.email === updatedInvite.email) ||
          (!!updatedInvite.userId && invite.userId === updatedInvite.userId));
      return _.merge(doc._source, { invites }); // eslint-disable-line no-underscore-dangle
    });

    yield updateESPromise(logger, origRequestId, projectId, updateDocPromise);
    logger.debug('elasticsearch index updated successfully');
    channel.ack(msg);
  } catch (error) {
    logger.error('Error handling projectMemberInviteCreated Event', error);
    // if the message has been redelivered dont attempt to reprocess it
    channel.nack(msg, false, !msg.fields.redelivered);
  }
});

module.exports = {
  projectMemberInviteCreatedHandler,
  projectMemberInviteUpdatedHandler,
};
