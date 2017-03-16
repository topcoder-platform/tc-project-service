/* eslint-disable no-console */
/**
 * Sync the elastic search indices.
 * For the application to funtion properly it is necessary
 * that following indices are created in elasticsearch before running the application
 *
 * 1. projects: Index for projects. Logically corresponds to project model
 *              and serves as parent for other indices
 *
 * 2. project_members: Index for project members. Logically corresponds to projectMember model.
 *
 * 3. project_attachments: Index for project attachments. Logically corresponds to projectAttachment model.
 */

import elasticsearch from 'elasticsearch';
import config from 'config';
import co from 'co';
import _ from 'lodash';
import { ELASTICSEARCH_INDICES } from '../src/constants';

// create new elasticsearch client
const eClient = new elasticsearch.Client(config.elasticsearchConfig);

/**
 * Get the request body for the specified index name
 * @private
 *
 * @param  {String}       indexName         the index name
 * @return {Object}                         the request body for the specified index name
 */
function getRequestBody(indexName) {
  let result;
  switch (indexName) {
    case ELASTICSEARCH_INDICES.TC_PROJECT_SERVICE:
      result = {
        index: indexName,
        updateAllTypes: true,
        body: {
          mappings: {
            projects: {
              _all: { enabled: false },
              properties: {
                directProjectId: { type: 'long' },
                billingAccountId: { type: 'long' },
                name: { type: 'string' },
                description: { type: 'string' },
                external: { type: 'object' },
                bookmarks: { type: 'nested' },
                utm: { type: 'object' },
                estimatedPrice: { type: 'double' },
                actualPrice: { type: 'double' },
                type: { type: 'string', index: 'not_analyzed' },
                status: { type: 'string', index: 'not_analyzed' },
                details: { type: 'object' },
                challengeEligibility: { type: 'nested' },
                cancelReason: { type: 'string' },
              },
            },
            members: {
              _parent: {
                type: 'projects',
              },
              _all: { enabled: false },
              properties: {
                userId: { type: 'long' },
                role: { type: 'string', index: 'not_analyzed' },
                isPrimary: { type: 'boolean' },
              },
            },
            attachments: {
              _parent: {
                type: 'projects',
              },
              _all: { enabled: false },
              properties: {
                title: { type: 'string' },
                size: { type: 'double' },
                category: { type: 'string', index: 'not_analyzed' },
                description: { type: 'string' },
                filePath: { type: 'string' },
                contentType: { type: 'string', index: 'not_analyzed' },
              },
            },
          },
        },
      };
      break;
    default:
      throw new Error('Invalid index name');
  }
  return result;
}

co(function* wrapped() {
  const indices = _.values(ELASTICSEARCH_INDICES);
  // using for loop as yield is not accisible inside forEach, each callback functions
  for (let i = 0; i < indices.length; i += 1) {
    // first delete the index if already present
    yield eClient.indices.delete({
      index: indices[i],
      // we would want to ignore no such index error
      ignore: [404],
    });
    // create a new index
    yield eClient.indices.create(getRequestBody(indices[i]));
  }
}).then(() => {
  console.log('elasticsearch indices synced successfully');
}).catch((err) => {
  console.error('elasticsearch indices sync failed', err);
});
