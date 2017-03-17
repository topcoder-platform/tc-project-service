import config from 'config';
import _ from 'lodash';
import elasticsearch from 'elasticsearch';
import urlencode from 'urlencode';
import { PROJECT_MEMBER_ROLE, ELASTICSEARCH_INDICES, ELASTICSEARCH_INDICES_TYPES } from '../../constants';
import util from '../../util';
import models from '../../models';
import directProject from '../../services/directProject';

// create new elasticsearch client
// the client modifies the config object, so always passed the cloned object
const eClient = new elasticsearch.Client(_.cloneDeep(config.elasticsearchConfig));

/**
 * Project member added event handler
 * @param  {Object} logger  logger
 * @param  {Object} msg     event payload
 * @param  {Object} channel channel to ack / nack
 * @return {undefined}
 */
const projectMemberAddedHandler = (logger, msg, channel) => {
  const origRequestId = msg.properties.correlationId;
  const newMember = JSON.parse(msg.content.toString());

  let addCMPromise;
  if (newMember.role === PROJECT_MEMBER_ROLE.COPILOT) {
    addCMPromise = new Promise((accept, reject) => {
      models.Project.getDirectProjectId(newMember.projectId)
        .then((directProjectId) => {
          if (directProjectId) {
            util.getSystemUserToken(logger)
              .then((token) => {
                const req = {
                  id: origRequestId,
                  log: logger,
                  headers: {
                    authorization: `Bearer ${token}`,
                  },
                };
                // add copilot to direct project
                directProject.addCopilot(req, directProjectId, {
                  copilotUserId: newMember.userId,
                }).then(() => {
                  logger.debug('added copilot to direct');
                  accept();
                }).catch(reject);
              }).catch(reject);
          } else {
            logger.info('project not associated with a direct project, skipping');
            accept();
          }
        }).catch(reject);
    });
  } else if (newMember.role === PROJECT_MEMBER_ROLE.MANAGER) {
    addCMPromise = new Promise((accept, reject) => {
      models.Project.getDirectProjectId(newMember.projectId)
        .then((directProjectId) => {
          if (directProjectId) {
            util.getSystemUserToken(logger)
              .then((token) => {
                const req = {
                  id: origRequestId,
                  log: logger,
                  headers: {
                    authorization: `Bearer ${token}`,
                  },
                };
                // update direct project permissions
                directProject.editProjectPermissions(req, directProjectId, {
                  permissions: [
                    {
                      userId: newMember.userId,
                      permissionType: {
                        permissionTypeId: 3,
                        name: 'project_full',
                      },
                      studio: false,
                    },
                  ],
                }).then(() => {
                  logger.debug('added manager to direct');
                  accept();
                }).catch(reject);
              }).catch(reject);
          } else {
            logger.info('project not associated with a direct project, skipping');
            accept();
          }
        }).catch(reject);
    });
  }

  const httpClient = util.getHttpClient({ id: msg.properties.correlationId });

  const updateESPromise = new Promise((accept, reject) => {
    const userIds = [urlencode(`userId&${newMember.userId}`, 'utf8')];
    // fetch the member information
    httpClient.get(`${config.membersServiceEndpoint}/_search?query=${userIds.join(urlencode(' OR ', 'utf8'))}`)
      .then((memberDetails) => {
        let payload = newMember;
        if (_.has(memberDetails, 'result.content')) {
          payload = _.merge(newMember, _.pick(memberDetails.result.content,
            'handle', 'firstName', 'lastName', 'email'));
        }
        // first fetch the existing project
        eClient.get({
          index: ELASTICSEARCH_INDICES.TC_PROJECT_SERVICE,
          type: ELASTICSEARCH_INDICES_TYPES.PROJECT,
          id: newMember.projectId,
        }).then((doc) => {
          // now merge the updated changes and reindex the document
          const members = _.isArray(doc._source.members) ? doc._source.members : [];      // eslint-disable-line no-underscore-dangle
          members.push(payload);
          const merged = _.merge(doc._source, { members });   // eslint-disable-line no-underscore-dangle
          // update the merged document
          eClient.update({
            index: ELASTICSEARCH_INDICES.TC_PROJECT_SERVICE,
            type: ELASTICSEARCH_INDICES_TYPES.PROJECT,
            id: newMember.projectId,
            body: {
              doc: merged,
            },
          }).then(() => {
            logger.debug('elasticsearch project document updated, new member added successfully');
          }).catch(reject);
        }).catch(reject);
      }).catch(reject);
  });

  const allPromises = [updateESPromise];
  if (addCMPromise) {
    allPromises.push(addCMPromise);
  }

  Promise.all(allPromises).then(() => {
    logger.info('elasticsearch index updated successfully and co-pilot/manager updated in direct project');
    channel.ack(msg);
  }).catch((error) => {
    logger.error('failed to consume message, unexpected error', error);
    // if the message has been redelivered dont attempt to reprocess it
    channel.nack(msg, false, !msg.fields.redelivered);
  });
};

/**
 * Project member removed event handler
 * @param  {Object} logger  logger
 * @param  {Object} msg     event payload
 * @param  {Object} channel channel to ack / nack
 * @return {undefined}
 */
const projectMemberRemovedHandler = (logger, msg, channel) => {
  const origRequestId = msg.properties.correlationId;
  const member = JSON.parse(msg.content.toString());

  let removeCMPromise;

  if (member.role === PROJECT_MEMBER_ROLE.COPILOT) {
    // Delete co-pilot when a co-pilot is deleted from a project
    removeCMPromise = new Promise((accept, reject) => {
      models.Project.getDirectProjectId(member.projectId)
        .then((directProjectId) => {
          if (directProjectId) {
            util.getSystemUserToken(logger)
              .then((token) => {
                const req = {
                  id: origRequestId,
                  log: logger,
                  headers: {
                    authorization: `Bearer ${token}`,
                  },
                };
                directProject.deleteCopilot(req, directProjectId, {
                  copilotUserId: member.userId,
                }).then(() => {
                  logger.debug('removed copilot from direct');
                  accept();
                }).catch(reject);
              }).catch(reject);
          } else {
            logger.info('project not associated with a direct project, skipping');
            accept();
          }
        }).catch(reject);
    });
  } else if (member.role === PROJECT_MEMBER_ROLE.MANAGER) {
    // when a manager is removed from direct project we have to remove manager from direct
    removeCMPromise = new Promise((accept, reject) => {
      models.Project.getDirectProjectId(member.projectId)
        .then((directProjectId) => {
          if (directProjectId) {
            util.getSystemUserToken(logger)
              .then((token) => {
                const req = {
                  id: origRequestId,
                  log: logger,
                  headers: {
                    authorization: `Bearer ${token}`,
                  },
                };
                // update direct project permissions
                directProject.editProjectPermissions(req, directProjectId, {
                  permissions: [
                    {
                      userId: member.userId,
                      resourceId: directProjectId,
                      permissionType: {
                        permissionTypeId: '',
                        name: 'project_full',
                      },
                      studio: false,
                    },
                  ],
                }).then(() => {
                  logger.debug('removed manager from direct');
                  accept();
                }).catch(reject);
              }).catch(reject);
          } else {
            logger.info('project not associated with a direct project, skipping');
            accept();
          }
        }).catch(reject);
    });
  }

  const updateESPromise = new Promise((accept, reject) => {
    // first fetch the existing project
    eClient.get({
      index: ELASTICSEARCH_INDICES.TC_PROJECT_SERVICE,
      type: ELASTICSEARCH_INDICES_TYPES.PROJECT,
      id: member.projectId,
    }).then((doc) => {
      // now merge the updated changes and reindex the document
      const members = _.filter(doc._source.members, single => single.id !== member.id);   // eslint-disable-line no-underscore-dangle
      const merged = _.merge(doc._source, { members });    // eslint-disable-line no-underscore-dangle
      // update the merged document
      eClient.update({
        index: ELASTICSEARCH_INDICES.TC_PROJECT_SERVICE,
        type: ELASTICSEARCH_INDICES_TYPES.PROJECT,
        id: member.projectId,
        body: {
          doc: merged,
        },
      }).then(() => {
        logger.debug('elasticsearch project document updated, member removed successfully');
      }).catch(reject);
    }).catch(reject);
  });

  const allPromises = [updateESPromise];
  if (removeCMPromise) {
    allPromises.push(removeCMPromise);
  }

  Promise.all(allPromises).then(() => {
    logger.info('elasticsearch index updated successfully and co-pilot/manager removed in direct project');
    channel.ack(msg);
  }).catch((error) => {
    logger.error('failed to consume message, unexpected error', error);
    // if the message has been redelivered dont attempt to reprocess it
    channel.nack(msg, false, !msg.fields.redelivered);
  });
};

/**
 * Project member updated event handler
 * @param  {Object} logger  logger
 * @param  {Object} msg     event payload
 * @param  {Object} channel channel to ack / nack
 * @return {undefined}
 */
const projectMemberUpdatedHandler = (logger, msg, channel) => {
  const data = JSON.parse(msg.content.toString());
  const httpClient = util.getHttpClient({ id: msg.properties.correlationId });
  const userIds = [urlencode(`userId&${data.original.userId}`, 'utf8')];
  // get member information
  httpClient.get(`${config.membersServiceEndpoint}/_search?query=${userIds.join(urlencode(' OR ', 'utf8'))}`)
    .then((memberDetails) => {
      let payload = data.updated;
      if (_.has(memberDetails, 'result.content')) {
        payload = _.merge(data.updated, _.pick(memberDetails.result.content,
          'handle', 'firstName', 'lastName', 'email'));
      }
      eClient.get({
        index: ELASTICSEARCH_INDICES.TC_PROJECT_SERVICE,
        type: ELASTICSEARCH_INDICES_TYPES.PROJECT,
        id: data.original.projectId,
      }).then((doc) => {
        // merge the changes and update the elasticsearch index
        const members = _.map(doc._source.members, (single) => {   // eslint-disable-line no-underscore-dangle
          if (single.id === data.original.id) {
            return _.merge(single, payload);
          }
          return single;
        });
        const merged = _.merge(doc._source, { members });     // eslint-disable-line no-underscore-dangle
        // update the merged document
        eClient.update({
          index: ELASTICSEARCH_INDICES.TC_PROJECT_SERVICE,
          type: ELASTICSEARCH_INDICES_TYPES.PROJECT,
          id: data.original.projectId,
          body: {
            doc: merged,
          },
        }).then(() => {
          logger.debug('elasticsearch project document updated, member updated successfully');
        }).catch((error) => {
          logger.error('Error updating project document in elasticsearch', error);
          channel.nack(msg, false, !msg.fields.redelivered);
        });
      }).catch((error) => {
        logger.error('Error fetching project document from elasticsearch', error);
        channel.nack(msg, false, !msg.fields.redelivered);
      });
    }).catch((error) => {
      logger.error('Error fetching project document from elasticsearch', error);
      channel.nack(msg, false, !msg.fields.redelivered);
    });
};

module.exports = {
  projectMemberAddedHandler,
  projectMemberRemovedHandler,
  projectMemberUpdatedHandler,
};
