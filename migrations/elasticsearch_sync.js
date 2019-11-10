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

const allowedIndexes = [ES_PROJECT_INDEX, ES_TIMELINE_INDEX, ES_METADATA_INDEX];

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

  // form config can be present inside 3 models, so we reuse it
  const formConfig = {
    type: 'object',
    properties: {
      sections: {
        type: 'nested',
        properties: {
          subSections: {
            type: 'nested',
            properties: {
              questions: {
                type: 'nested',
                properties: {
                  options: {
                    type: 'nested',
                    properties: {
                      value: {
                        type: 'string',
                      },
                    },
                  },
                },
              },
            },
          },
        },
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
          scope: formConfig,
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
          config: formConfig,
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
          template: formConfig,
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

      buildingBlocks: {
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

/**
 * Sync elasticsearch indices.
 *
 * @param {String} [indexName] index name to sync, if it's not define, then all indexes are recreated
 *
 * @returns {Promise} resolved when sync is complete
 */
async function sync(indexName) {
  if (indexName && allowedIndexes.indexOf(indexName) === -1) {
    throw new Error(`Index "${indexName}" is not supported.`);
  }
  const indexesToSync = indexName ? [indexName] : allowedIndexes;

  for (let i = 0; i < indexesToSync.length; i += 1) {
    const indexToSync = indexesToSync[i];

    console.log(`Deleting "${indexToSync}" index...`);
    await esClient.indices.delete({ index: indexToSync, ignore: [404] }); // eslint-disable-line no-await-in-loop
    console.log(`Creating "${indexToSync}" index...`);
    await esClient.indices.create(getRequestBody(indexToSync)); // eslint-disable-line no-await-in-loop
  }
}

if (!module.parent) {
  // if we pass index name in command line arguments, then sync only that index
  const indexName = process.argv[2] === '--index-name' && process.argv[3] ? process.argv[3] : undefined;

  // to avoid accidental resetting of all indexes in PROD, enforce explicit defining of index name if not in
  // development or test environment
  if (['development', 'test'].indexOf(process.env.NODE_ENV) === -1 && !indexName) {
    console.error('Error. "--index-name" should be provided when run this command in non-development environment.');
    console.error('Example usage: "$ npm run sync:es -- --index-name metadata"');
    process.exit(1);
  }

  sync(indexName)
    .then(() => {
      console.log('ElasticSearch indices synced successfully.');
      process.exit();
    })
    .catch((err) => {
      console.error('ElasticSearch indices sync failed: ', err);
      process.exit(1);
    });
}

module.exports = {
  sync,
};
