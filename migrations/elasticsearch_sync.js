/* eslint-disable no-console */
/**
 * Sync the elastic search indices.
 * For the application to funtion properly it is necessary
 * that following indices are created in elasticsearch before running the application
 *
 * 1. projects: Index for projects. Logically corresponds to project model
 *              and serves as root.
 *              members and attachments will be stored as nested objects to parent document
 *
 */

import elasticsearch from 'elasticsearch';
import config from 'config';
import co from 'co';
import _ from 'lodash';
import { ELASTICSEARCH_INDICES, ELASTICSEARCH_INDICES_TYPES } from '../src/constants';

// create new elasticsearch client
// the client modifies the config object, so always passed the cloned object
const eClient = new elasticsearch.Client(_.cloneDeep(config.elasticsearchConfig));

/**
 * Get the request body for the specified index name
 * @private
 *
 * @param  {String}       indexName         the index name
 * @return {Object}                         the request body for the specified index name
 */
function getRequestBody(indexName) {
  let result;
  const projectMapping = {
    _all: { enabled: false },
    properties: {
      directProjectId: { type: 'long' },
      billingAccountId: { type: 'long' },
      name: { type: 'string' },
      description: { type: 'string' },
      external: { type: 'object',
        properties: {
          id: { type: 'string', index: 'not_analyzed' },
          type: { type: 'string', index: 'not_analyzed' },
          data: { type: 'string' },
        } },
      bookmarks: { type: 'nested',
        properties: {
          title: { type: 'string' },
          address: { type: 'string' },
        } },
      utm: { type: 'object',
        properties: {
          campaign: { type: 'string' },
          medium: { type: 'string' },
          source: { type: 'string' },
        } },
      estimatedPrice: { type: 'double' },
      actualPrice: { type: 'double' },
      terms: { type: 'integer' },
      type: { type: 'string', index: 'not_analyzed' },
      status: { type: 'string', index: 'not_analyzed' },
      details: { type: 'nested',
        properties: {
          summary: { type: 'string' },
          TBD_usageDescription: { type: 'string' },
          TBD_features: { type: 'nested',
            properties: {
              id: { type: 'integer' },
              title: { type: 'string' },
              description: { type: 'string' },
              isCustom: { type: 'boolean' },
            } },
        } },
      challengeEligibility: { type: 'nested',
        properties: {
          role: { type: 'string', index: 'not_analyzed' },
          users: { type: 'long' },
          groups: { type: 'long' },
        } },
      cancelReason: { type: 'string' },
      createdAt: { type: 'date' },
      updatedAt: { type: 'date' },
      createdBy: { type: 'integer' },
      updatedBy: { type: 'integer' },
      // project members nested data type
      members: {
        type: 'nested',
        properties: {
          userId: { type: 'long' },
          projectId: { type: 'long' },
          role: { type: 'string', index: 'not_analyzed' },
          isPrimary: { type: 'boolean' },
          createdAt: { type: 'date' },
          updatedAt: { type: 'date' },
          createdBy: { type: 'integer' },
          updatedBy: { type: 'integer' },
        },
      },
      // project attachments nested data type
      attachments: {
        type: 'nested',
        properties: {
          title: { type: 'string' },
          size: { type: 'double' },
          category: { type: 'string', index: 'not_analyzed' },
          description: { type: 'string' },
          filePath: { type: 'string' },
          projectId: { type: 'long' },
          contentType: { type: 'string', index: 'not_analyzed' },
          createdAt: { type: 'date' },
          updatedAt: { type: 'date' },
          createdBy: { type: 'integer' },
          updatedBy: { type: 'integer' },
        },
      },
    },
  };
  switch (indexName) {
    case ELASTICSEARCH_INDICES.TC_PROJECT_SERVICE:
      result = {
        index: indexName,
        updateAllTypes: true,
        body: {
          mappings: { },
        },
      };
      result.body.mappings[ELASTICSEARCH_INDICES_TYPES.PROJECT] = projectMapping;
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
