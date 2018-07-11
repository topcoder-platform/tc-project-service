/**
 * Event handlers for milestone create, update and delete.
 */
import config from 'config';
import _ from 'lodash';
import Promise from 'bluebird';
import util from '../../util';

const ES_TIMELINE_INDEX = config.get('elasticsearchConfig.timelineIndexName');
const ES_TIMELINE_TYPE = config.get('elasticsearchConfig.timelineDocType');

const eClient = util.getElasticSearchClient();

/**
 * Handler for milestone creation event
 * @param  {Object} logger  logger to log along with trace id
 * @param  {Object} msg     event payload
 * @param  {Object} channel channel to ack, nack
 */
const milestoneAddedHandler = Promise.coroutine(function* (logger, msg, channel) { // eslint-disable-line func-names
  const data = JSON.parse(msg.content.toString());
  try {
    const doc = yield eClient.get({ index: ES_TIMELINE_INDEX, type: ES_TIMELINE_TYPE, id: data.timelineId });
    const milestones = _.isArray(doc._source.milestones) ? doc._source.milestones : []; // eslint-disable-line no-underscore-dangle

    // Increase the order of the other milestones in the same timeline,
    // which have `order` >= this milestone order
    _.each(milestones, (milestone) => {
      if (milestone.order >= data.order) {
        milestone.order += 1; // eslint-disable-line no-param-reassign
      }
    });

    milestones.push(data);
    const merged = _.assign(doc._source, { milestones }); // eslint-disable-line no-underscore-dangle
    yield eClient.update({
      index: ES_TIMELINE_INDEX,
      type: ES_TIMELINE_TYPE,
      id: data.timelineId,
      body: { doc: merged },
    });
    logger.debug('milestone added to timeline document successfully');
    channel.ack(msg);
  } catch (error) {
    logger.error(`Error processing event (milestoneId: ${data.id})`, error);
    // if the message has been redelivered dont attempt to reprocess it
    channel.nack(msg, false, !msg.fields.redelivered);
  }
});

/**
 * Handler for milestone updated event
 * @param  {Object} logger  logger to log along with trace id
 * @param  {Object} msg     event payload
 * @param  {Object} channel channel to ack, nack
 * @returns {undefined}
 */
const milestoneUpdatedHandler = Promise.coroutine(function* (logger, msg, channel) { // eslint-disable-line func-names
  const data = JSON.parse(msg.content.toString());
  try {
    const doc = yield eClient.get({ index: ES_TIMELINE_INDEX, type: ES_TIMELINE_TYPE, id: data.original.timelineId });
    const milestones = _.map(doc._source.milestones, (single) => { // eslint-disable-line no-underscore-dangle
      if (single.id === data.original.id) {
        return _.assign(single, data.updated);
      }
      return single;
    });

    if (data.original.order !== data.updated.order) {
      const milestoneWithSameOrder =
        _.find(milestones, milestone => milestone.id !== data.updated.id && milestone.order === data.updated.order);
      if (milestoneWithSameOrder) {
        // Increase the order from M to K: if there is an item with order K,
        // orders from M+1 to K should be made M to K-1
        if (data.original.order < data.updated.order) {
          _.each(milestones, (single) => {
            if (single.id !== data.updated.id
              && (data.original.order + 1) <= single.order
              && single.order <= data.updated.order) {
              single.order -= 1; // eslint-disable-line no-param-reassign
            }
          });
        } else {
          // Decrease the order from M to K: if there is an item with order K,
          // orders from K to M-1 should be made K+1 to M
          _.each(milestones, (single) => {
            if (single.id !== data.updated.id
              && data.updated.order <= single.order
              && single.order <= (data.original.order - 1)) {
              single.order += 1; // eslint-disable-line no-param-reassign
            }
          });
        }
      }
    }

    const merged = _.assign(doc._source, { milestones }); // eslint-disable-line no-underscore-dangle
    yield eClient.update({
      index: ES_TIMELINE_INDEX,
      type: ES_TIMELINE_TYPE,
      id: data.original.timelineId,
      body: {
        doc: merged,
      },
    });
    logger.debug('elasticsearch index updated, milestone updated successfully');
    channel.ack(msg);
  } catch (error) {
    logger.error(`Error processing event (milestoneId: ${data.original.id})`, error);
    // if the message has been redelivered dont attempt to reprocess it
    channel.nack(msg, false, !msg.fields.redelivered);
  }
});

/**
 * Handler for milestone deleted event
 * @param  {Object} logger  logger to log along with trace id
 * @param  {Object} msg     event payload
 * @param  {Object} channel channel to ack, nack
 * @returns {undefined}
 */
const milestoneRemovedHandler = Promise.coroutine(function* (logger, msg, channel) { // eslint-disable-line func-names
  const data = JSON.parse(msg.content.toString());
  try {
    const doc = yield eClient.get({ index: ES_TIMELINE_INDEX, type: ES_TIMELINE_TYPE, id: data.timelineId });
    const milestones = _.filter(doc._source.milestones, single => single.id !== data.id); // eslint-disable-line no-underscore-dangle
    const merged = _.assign(doc._source, { milestones });       // eslint-disable-line no-underscore-dangle
    yield eClient.update({
      index: ES_TIMELINE_INDEX,
      type: ES_TIMELINE_TYPE,
      id: data.timelineId,
      body: {
        doc: merged,
      },
    });
    logger.debug('milestone removed from timeline document successfully');
    channel.ack(msg);
  } catch (error) {
    logger.error(`Error processing event (milestoneId: ${data.id})`, error);
    // if the message has been redelivered dont attempt to reprocess it
    channel.nack(msg, false, !msg.fields.redelivered);
  }
});


module.exports = {
  milestoneAddedHandler,
  milestoneRemovedHandler,
  milestoneUpdatedHandler,
};
