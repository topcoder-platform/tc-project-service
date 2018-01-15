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


import config from 'config';
import util from '../src/util';

const ES_PROJECT_INDEX = config.get('elasticsearchConfig.indexName');
const ES_PROJECT_TYPE = config.get('elasticsearchConfig.docType');

// create new elasticsearch client
// the client modifies the config object, so always passed the cloned object
const esClient = util.getElasticSearchClient();

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
      id: { type: 'long' },
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
          utm: { type: 'nested',
            properties: {
              code: { type: 'string' },
            } },
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
          id: { type: 'long' },
          userId: { type: 'long' },
          projectId: { type: 'long' },
          role: { type: 'string', index: 'not_analyzed' },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          email: { type: 'string', index: 'not_analyzed' },
          handle: { type: 'string', index: 'not_analyzed' },
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
          id: { type: 'long' },
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
    case ES_PROJECT_INDEX:
      result = {
        index: indexName,
        updateAllTypes: true,
        body: {
          mappings: { },
        },
      };
      result.body.mappings[ES_PROJECT_TYPE] = projectMapping;
      break;
    default:
      throw new Error(`Invalid index name '${indexName}'`);
  }
  return result;
}

    // first delete the index if already present
esClient.indices.delete({
  index: ES_PROJECT_INDEX,
  // we would want to ignore no such index error
  ignore: [404],
})
.then(() => esClient.indices.create(getRequestBody(ES_PROJECT_INDEX)))
.then(() => {
  console.log('elasticsearch indices synced successfully');
  process.exit();
}).catch((err) => {
  console.error('elasticsearch indices sync failed', err);
  process.exit();
});
