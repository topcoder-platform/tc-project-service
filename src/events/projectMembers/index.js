/**
 * Event handlers for project members create, update and delete
 */
import _ from 'lodash';
import config from 'config';
import { PROJECT_MEMBER_ROLE } from '../../constants';
import util from '../../util';
import models from '../../models';
import directProject from '../../services/directProject';

const ES_PROJECT_INDEX = config.get('elasticsearchConfig.indexName');
const ES_PROJECT_TYPE = config.get('elasticsearchConfig.docType');
const eClient = util.getElasticSearchClient();

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
  // add copilot/update manager permissions operation promise
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

  const updateESPromise = new Promise((accept, reject) => {
    const userIds = [newMember.userId];
    // fetch the member information
    return util.getMemberDetailsByUserIds(userIds)
      .then((memberDetails) => {
        if (!_.isArray(memberDetails) || memberDetails.length === 0) {
          logger.error(`Empty member details for userIds ${userIds.join(',')} requeing the message`);
          channel.nack(msg, false, !msg.fields.redelivered);
          return undefined;
        }
        const payload = _.merge(newMember, _.pick(memberDetails[0], 'handle', 'firstName', 'lastName', 'email'));
        // first fetch the existing project
        return eClient.get({
          index: ES_PROJECT_INDEX,
          type: ES_PROJECT_TYPE,
          id: newMember.projectId,
        }).then((doc) => {
          // now merge the updated changes and reindex the document
          const members = _.isArray(doc._source.members) ? doc._source.members : [];      // eslint-disable-line no-underscore-dangle
          members.push(payload);
          const merged = _.merge(doc._source, { members });   // eslint-disable-line no-underscore-dangle
          // update the merged document
          return eClient.update({
            index: ES_PROJECT_INDEX,
            type: ES_PROJECT_TYPE,
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
    logger.debug('elasticsearch index updated successfully and co-pilot/manager updated in direct project');
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
  // remove copilot/manager operation promise
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
      index: ES_PROJECT_INDEX,
      type: ES_PROJECT_TYPE,
      id: member.projectId,
    }).then((doc) => {
      // now merge the updated changes and reindex the document
      const members = _.filter(doc._source.members, single => single.id !== member.id);   // eslint-disable-line no-underscore-dangle
      const merged = _.merge(doc._source, { members });    // eslint-disable-line no-underscore-dangle
      // update the merged document
      eClient.update({
        index: ES_PROJECT_INDEX,
        type: ES_PROJECT_TYPE,
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
    logger.debug('elasticsearch index updated successfully and co-pilot/manager removed in direct project');
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
  // get member information
  return util.getMemberDetailsByUserIds[data.original.userId]
    .then((memberDetails) => {
      const payload = _.merge(data.updated, _.pick(memberDetails[0], 'handle', 'firstName', 'lastName', 'email'));
      return eClient.get({
        index: ES_PROJECT_INDEX,
        type: ES_PROJECT_TYPE,
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
        return eClient.update({
          index: ES_PROJECT_INDEX,
          type: ES_PROJECT_TYPE,
          id: data.original.projectId,
          body: {
            doc: merged,
          },
        }).then(() => {
          logger.debug('elasticsearch project document updated, member updated successfully');
          channel.ack(msg);
        }).catch((error) => {
          logger.error('Error updating project document in elasticsearch', error);
          channel.nack(msg, false, !msg.fields.redelivered);
        });
      }).catch((error) => {
        logger.error('Error fetching project document from elasticsearch', error);
        channel.nack(msg, false, !msg.fields.redelivered);
      });
    }).catch((error) => {
      logger.error('Error fetching member details from member service', error);
      channel.nack(msg, false, !msg.fields.redelivered);
    });
};

module.exports = {
  projectMemberAddedHandler,
  projectMemberRemovedHandler,
  projectMemberUpdatedHandler,
};
