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
const ES_TIMELINE_INDEX = config.get('elasticsearchConfig.timelineIndexName');
const ES_TIMELINE_TYPE = config.get('elasticsearchConfig.timelineDocType');
const ES_METADATA_INDEX = config.get('elasticsearchConfig.metadataIndexName');
const ES_METADATA_TYPE = config.get('elasticsearchConfig.metadataDocType');

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
      invites: {
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
          id: {
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
          projectId: {
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
      lastActivityAt: {
        type: 'date',
        format: 'strict_date_optional_time||epoch_millis',
      },
      lastActivityUserId: {
        type: 'string',
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
      phases: {
        type: 'nested',
        dynamic: true,
      },
    },
  };

  const metadataMapping = {
    _all: { enabled: false },
    properties: {
      projectTemplates: {
        type: 'nested',
        properties: {
          createdAt: {
            type: 'date',
            format: 'strict_date_optional_time||epoch_millis',
          },
          createdBy: {
            type: 'integer',
          },
          key: {
            type: 'string',
            index: 'not_analyzed',
          },
          category: {
            type: 'string',
            index: 'not_analyzed',
          },
          name: {
            type: 'string',
          },
          id: {
            type: 'long',
          },
          scope: {
            type: 'object',
          },
          form: {
            type: 'object',
          },
          priceConfig: {
            type: 'object',
          },
          planConfig: {
            type: 'object',
          },
          phases: {
            type: 'object',
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
      forms: {
        type: 'nested',
        properties: {
          createdAt: {
            type: 'date',
            format: 'strict_date_optional_time||epoch_millis',
          },
          createdBy: {
            type: 'integer',
          },
          key: {
            type: 'string',
            index: 'not_analyzed',
          },
          version: {
            type: 'integer',
          },
          revision: {
            type: 'integer',
          },
          id: {
            type: 'long',
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

      planConfigs: {
        type: 'nested',
        properties: {
          createdAt: {
            type: 'date',
            format: 'strict_date_optional_time||epoch_millis',
          },
          createdBy: {
            type: 'integer',
          },
          key: {
            type: 'string',
            index: 'not_analyzed',
          },
          version: {
            type: 'integer',
          },
          revision: {
            type: 'integer',
          },
          id: {
            type: 'long',
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

      priceConfigs: {
        type: 'nested',
        properties: {
          createdAt: {
            type: 'date',
            format: 'strict_date_optional_time||epoch_millis',
          },
          createdBy: {
            type: 'integer',
          },
          key: {
            type: 'string',
            index: 'not_analyzed',
          },
          version: {
            type: 'integer',
          },
          revision: {
            type: 'integer',
          },
          id: {
            type: 'long',
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

      orgConfigs: {
        type: 'nested',
        properties: {
          createdAt: {
            type: 'date',
            format: 'strict_date_optional_time||epoch_millis',
          },
          createdBy: {
            type: 'integer',
          },
          orgId: {
            type: 'string',
            index: 'not_analyzed',
          },
          configName: {
            type: 'string',
            index: 'not_analyzed',
          },
          configValue: {
            type: 'string',
          },
          id: {
            type: 'long',
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

      productTemplates: {
        type: 'nested',
        properties: {
          createdAt: {
            type: 'date',
            format: 'strict_date_optional_time||epoch_millis',
          },
          createdBy: {
            type: 'integer',
          },
          name: {
            type: 'string',
          },
          productKey: {
            type: 'string',
            index: 'not_analyzed',
          },
          category: {
            type: 'string',
          },
          subCategory: {
            type: 'string',
            index: 'not_analyzed',
          },
          id: {
            type: 'long',
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

      projectTypes: {
        type: 'nested',
        properties: {
          createdAt: {
            type: 'date',
            format: 'strict_date_optional_time||epoch_millis',
          },
          createdBy: {
            type: 'integer',
          },
          displayName: {
            type: 'string',
          },
          key: {
            type: 'string',
            index: 'not_analyzed',
          },
          id: {
            type: 'long',
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

      productCategories: {
        type: 'nested',
        properties: {
          createdAt: {
            type: 'date',
            format: 'strict_date_optional_time||epoch_millis',
          },
          createdBy: {
            type: 'integer',
          },
          displayName: {
            type: 'string',
          },
          key: {
            type: 'string',
            index: 'not_analyzed',
          },
          id: {
            type: 'long',
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

      milestoneTemplates: {
        type: 'nested',
        properties: {
          referenceId: {
            type: 'long',
          },
          reference: {
            type: 'string',
            index: 'not_analyzed',
          },
          id: {
            type: 'long',
          },
          order: {
            type: 'long',
          },
        },
      },
    },
  };

  const timelineMapping = {
    _all: { enabled: false },
    properties: {
      milestones: {
        type: 'nested',
        properties: {
          id: {
            type: 'long',
          },
          timelineId: {
            type: 'long',
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
    case ES_METADATA_INDEX:
      result = {
        index: indexName,
        updateAllTypes: true,
        body: {
          mappings: { },
        },
      };
      result.body.mappings[ES_METADATA_TYPE] = metadataMapping;
      break;
    case ES_TIMELINE_INDEX:
      result = {
        index: indexName,
        updateAllTypes: true,
        body: {
          mappings: { },
        },
      };
      result.body.mappings[ES_TIMELINE_TYPE] = timelineMapping;
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
// Re-create timeline index
.then(() => esClient.indices.delete({ index: ES_TIMELINE_INDEX, ignore: [404] }))
.then(() => esClient.indices.create(getRequestBody(ES_TIMELINE_INDEX)))
// Re-create metadata index
.then(() => esClient.indices.delete({ index: ES_METADATA_INDEX, ignore: [404] }))
.then(() => esClient.indices.create(getRequestBody(ES_METADATA_INDEX)))
.then(() => {
  console.log('elasticsearch indices synced successfully');
  process.exit();
})
.catch((err) => {
  console.error('elasticsearch indices sync failed', err);
  process.exit();
});
