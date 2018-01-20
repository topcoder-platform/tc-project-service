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
      actualPrice: {
        type: 'double',
      },
      attachments: {
        type: 'nested',
        properties: {
          category: {
            type: 'string',
            index: 'not_analyzed',
          },
          contentType: {
            type: 'string',
            index: 'not_analyzed',
          },
          createdAt: {
            type: 'date',
            format: 'strict_date_optional_time||epoch_millis',
          },
          createdBy: {
            type: 'integer',
          },
          description: {
            type: 'string',
          },
          filePath: {
            type: 'string',
          },
          id: {
            type: 'long',
          },
          projectId: {
            type: 'long',
          },
          size: {
            type: 'double',
          },
          title: {
            type: 'string',
          },
          updatedAt: {
            type: 'date',
            format: 'strict_date_optional_time||epoch_millis',
          },
          updatedBy: {
            type: 'integer',
          },
        },
      },
      billingAccountId: {
        type: 'long',
      },
      bookmarks: {
        type: 'nested',
        properties: {
          address: {
            type: 'string',
          },
          title: {
            type: 'string',
          },
        },
      },
      cancelReason: {
        type: 'string',
      },
      challengeEligibility: {
        type: 'nested',
        properties: {
          groups: {
            type: 'long',
          },
          role: {
            type: 'string',
            index: 'not_analyzed',
          },
          users: {
            type: 'long',
          },
        },
      },
      createdAt: {
        type: 'date',
        format: 'strict_date_optional_time||epoch_millis',
      },
      createdBy: {
        type: 'integer',
      },
      description: {
        type: 'string',
      },
      details: {
        type: 'nested',
        properties: {
          TBD_features: {
            type: 'nested',
            properties: {
              description: {
                type: 'string',
              },
              id: {
                type: 'integer',
              },
              isCustom: {
                type: 'boolean',
              },
              title: {
                type: 'string',
              },
            },
          },
          TBD_usageDescription: {
            type: 'string',
          },
          appDefinition: {
            properties: {
              goal: {
                properties: {
                  value: {
                    type: 'string',
                  },
                },
              },
              primaryTarget: {
                type: 'string',
              },
              users: {
                properties: {
                  value: {
                    type: 'string',
                  },
                },
              },
            },
          },
          hideDiscussions: {
            type: 'boolean',
          },
          products: {
            type: 'string',
          },
          summary: {
            type: 'string',
          },
          utm: {
            type: 'nested',
            properties: {
              code: {
                type: 'string',
              },
            },
          },
        },
      },
      directProjectId: {
        type: 'long',
      },
      estimatedPrice: {
        type: 'double',
      },
      external: {
        properties: {
          data: {
            type: 'string',
          },
          id: {
            type: 'string',
            index: 'not_analyzed',
          },
          type: {
            type: 'string',
            index: 'not_analyzed',
          },
        },
      },
      id: {
        type: 'long',
      },
      members: {
        type: 'nested',
        properties: {
          createdAt: {
            type: 'date',
            format: 'strict_date_optional_time||epoch_millis',
          },
          createdBy: {
            type: 'integer',
          },
          email: {
            type: 'string',
            index: 'not_analyzed',
          },
          firstName: {
            type: 'string',
          },
          handle: {
            type: 'string',
            index: 'not_analyzed',
          },
          id: {
            type: 'long',
          },
          isPrimary: {
            type: 'boolean',
          },
          lastName: {
            type: 'string',
          },
          projectId: {
            type: 'long',
          },
          role: {
            type: 'string',
            index: 'not_analyzed',
          },
          updatedAt: {
            type: 'date',
            format: 'strict_date_optional_time||epoch_millis',
          },
          updatedBy: {
            type: 'integer',
          },
          userId: {
            type: 'long',
          },
        },
      },
      name: {
        type: 'string',
      },
      status: {
        type: 'string',
        index: 'not_analyzed',
      },
      terms: {
        type: 'integer',
      },
      type: {
        type: 'string',
        index: 'not_analyzed',
      },
      updatedAt: {
        type: 'date',
        format: 'strict_date_optional_time||epoch_millis',
      },
      updatedBy: {
        type: 'integer',
      },
      utm: {
        properties: {
          campaign: {
            type: 'string',
          },
          medium: {
            type: 'string',
          },
          source: {
            type: 'string',
          },
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
